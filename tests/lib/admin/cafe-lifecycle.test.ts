import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, cache: <T,>(fn: T) => fn }
})

const mockGetCachedUser = vi.fn()
vi.mock('@/lib/supabase/user', () => ({ getCachedUser: () => mockGetCachedUser() }))

/**
 * One recorded update per test. `update()` captures what was written and which
 * filters narrowed it, because the filters are the safety property here: both
 * transitions are scoped by current status so they cannot move a café sideways
 * out of a state nobody decided to leave.
 */
type UpdateCall = { values: Record<string, unknown>; filters: Record<string, unknown> }

let updateCall: UpdateCall | null = null
let updateResult: { data: { id: string }[] | null; error: { message: string } | null }
let orderCount: { count: number | null; error: { message: string } | null }
const mockDeleteUser = vi.fn()

function tableStub(table: string) {
  if (table === 'orders') {
    return {
      select: () => ({ eq: async () => orderCount }),
    }
  }
  const filters: Record<string, unknown> = {}
  const chain = {
    update(values: Record<string, unknown>) {
      updateCall = { values, filters }
      return chain
    },
    eq(column: string, value: unknown) {
      filters[column] = value
      return chain
    },
    select: async () => updateResult,
  }
  return chain
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => tableStub(table),
    auth: { admin: { deleteUser: (id: string) => mockDeleteUser(id) } },
  }),
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ from: () => ({}) }) }))
vi.mock('@/lib/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), updateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next/server', () => ({ after: vi.fn() }))
vi.mock('@/lib/push/send', () => ({ sendPushToCafe: vi.fn(), sendPushToAdmins: vi.fn() }))
vi.mock('@/lib/site-url', () => ({ getSiteOrigin: async () => 'https://sherpasips.test' }))

const actions = await import('@/lib/admin/actions')

const CAFE_ID = '22222222-2222-4222-8222-222222222222'
const ADMIN_ID = '99999999-9999-4999-8999-999999999999'

beforeEach(() => {
  vi.clearAllMocks()
  updateCall = null
  updateResult = { data: [{ id: CAFE_ID }], error: null }
  orderCount = { count: 0, error: null }
  mockDeleteUser.mockResolvedValue({ error: null })
  mockGetCachedUser.mockResolvedValue({
    user: { id: ADMIN_ID, email: null, app_metadata: { role: 'admin' } },
    error: null,
  })
})

describe('suspendCafe', () => {
  it('freezes the café', async () => {
    await expect(actions.suspendCafe(CAFE_ID)).resolves.toEqual({})
    expect(updateCall?.values).toEqual({ status: 'suspended' })
  })

  // The filter is the guard: without it, a pending application could be moved
  // straight to suspended, which claims it was once approved.
  it('only touches a café that is currently active', async () => {
    await actions.suspendCafe(CAFE_ID)
    expect(updateCall?.filters).toEqual({ id: CAFE_ID, status: 'active' })
  })

  it('reports a café that was not active rather than claiming success', async () => {
    updateResult = { data: [], error: null }
    const result = await actions.suspendCafe(CAFE_ID)
    expect(result.error).toMatch(/only an active café/i)
  })

  it('rejects a malformed id before reaching the database', async () => {
    const result = await actions.suspendCafe('not-a-uuid')
    expect(result.error).toMatch(/invalid/i)
    expect(updateCall).toBeNull()
  })
})

describe('reactivateCafe', () => {
  it('unfreezes the café', async () => {
    await expect(actions.reactivateCafe(CAFE_ID)).resolves.toEqual({})
    expect(updateCall?.values).toEqual({ status: 'active' })
  })

  // Mirror image, and the more important of the two: this must not be a route
  // to approving a pending application or resurrecting a rejected one.
  it('only touches a café that is currently frozen', async () => {
    await actions.reactivateCafe(CAFE_ID)
    expect(updateCall?.filters).toEqual({ id: CAFE_ID, status: 'suspended' })
  })

  it('reports a café that was not frozen rather than claiming success', async () => {
    updateResult = { data: [], error: null }
    const result = await actions.reactivateCafe(CAFE_ID)
    expect(result.error).toMatch(/only a frozen café/i)
  })
})

describe('deleteCafe', () => {
  it('deletes a café that has never ordered', async () => {
    await expect(actions.deleteCafe(CAFE_ID)).resolves.toEqual({})
    expect(mockDeleteUser).toHaveBeenCalledWith(CAFE_ID)
  })

  // orders.cafe_id is `on delete restrict`, so the database would refuse this
  // too — but as a raw foreign-key error with no way forward. Refused here so
  // the reason and the alternative reach the admin.
  it('refuses a café with orders, and says how many', async () => {
    orderCount = { count: 3, error: null }

    const result = await actions.deleteCafe(CAFE_ID)

    expect(result.error).toContain('3 orders')
    expect(result.error).toMatch(/freeze/i)
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it('says "1 order", not "1 orders"', async () => {
    orderCount = { count: 1, error: null }
    const result = await actions.deleteCafe(CAFE_ID)
    expect(result.error).toContain('1 order on record')
    expect(result.error).not.toContain('1 orders')
  })

  // Deleting the café row alone would leave a login that can sign in and be
  // sent round to onboarding again. The auth user is what cascades.
  it('deletes the auth user, not the café row', async () => {
    await actions.deleteCafe(CAFE_ID)
    expect(mockDeleteUser).toHaveBeenCalledWith(CAFE_ID)
    expect(updateCall).toBeNull()
  })

  it('does not delete when the order count could not be read', async () => {
    orderCount = { count: null, error: { message: 'boom' } }

    const result = await actions.deleteCafe(CAFE_ID)

    expect(result.error).toMatch(/could not delete/i)
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it('surfaces a failure from the auth delete', async () => {
    mockDeleteUser.mockResolvedValue({ error: { message: 'nope' } })
    const result = await actions.deleteCafe(CAFE_ID)
    expect(result.error).toMatch(/could not delete/i)
  })

  it('rejects a malformed id before reaching the database', async () => {
    const result = await actions.deleteCafe('not-a-uuid')
    expect(result.error).toMatch(/invalid/i)
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })
})
