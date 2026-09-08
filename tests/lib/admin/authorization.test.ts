import { describe, it, expect, vi, beforeEach } from 'vitest'

// React's cache() memoises per request in production. Bypassed here so each
// test's mocked identity is actually re-read instead of a previous test's
// result being replayed.
vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, cache: <T,>(fn: T) => fn }
})

const mockGetCachedUser = vi.fn()
vi.mock('@/lib/supabase/user', () => ({ getCachedUser: () => mockGetCachedUser() }))

// The service-role client bypasses RLS entirely, so "was this constructed?" is
// the sharpest possible assertion: if an unauthorised caller ever reaches it,
// every row in the database is already exposed regardless of what the query
// then does.
const mockCreateAdminClient = vi.fn(() => {
  throw new Error('service-role client must not be reachable by this caller')
})
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => mockCreateAdminClient() }))

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ from: () => ({}) }) }))
vi.mock('@/lib/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), updateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next/server', () => ({ after: vi.fn() }))
vi.mock('@/lib/push/send', () => ({ sendPushToCafe: vi.fn(), sendPushToAdmins: vi.fn() }))

const actions = await import('@/lib/admin/actions')

function asUser(id: string, app_metadata: Record<string, unknown> = {}) {
  mockGetCachedUser.mockResolvedValue({ user: { id, email: null, app_metadata }, error: null })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateAdminClient.mockImplementation(() => {
    throw new Error('service-role client must not be reachable by this caller')
  })
})

// Every admin action reachable from the client, with arguments that are
// otherwise well-formed — so anything that rejects, rejects on authorisation
// and not on validation.
const ORDER_ID = '11111111-1111-4111-8111-111111111111'
const CAFE_ID = '22222222-2222-4222-8222-222222222222'
const PRODUCT_ID = '33333333-3333-4333-8333-333333333333'

const adminActions: [string, () => Promise<unknown>][] = [
  ['getCafes', () => actions.getCafes()],
  ['getCafe', () => actions.getCafe(CAFE_ID)],
  ['approveCafe', () => actions.approveCafe(CAFE_ID)],
  ['rejectCafe', () => actions.rejectCafe(CAFE_ID)],
  ['updateCafeCreditEnabled', () => actions.updateCafeCreditEnabled(CAFE_ID, true)],
  ['getCafeCompletedOrderCount', () => actions.getCafeCompletedOrderCount(CAFE_ID)],
  ['getCafeProductPricing', () => actions.getCafeProductPricing(CAFE_ID)],
  ['setCafeProductPrice', () => actions.setCafeProductPrice(CAFE_ID, PRODUCT_ID, 1)],
  ['getOrders', () => actions.getOrders()],
  ['getAdminOrder', () => actions.getAdminOrder(ORDER_ID)],
  ['getOrderInvoice', () => actions.getOrderInvoice(ORDER_ID)],
  ['updateOrderStatus', () => actions.updateOrderStatus(ORDER_ID, 'delivered')],
  ['updatePaymentStatus', () => actions.updatePaymentStatus(ORDER_ID, 'paid')],
  ['deleteOrder', () => actions.deleteOrder(ORDER_ID)],
  ['getPayments', () => actions.getPayments()],
  ['getProducts', () => actions.getProducts()],
  ['getProduct', () => actions.getProduct(PRODUCT_ID)],
  ['deleteProduct', () => actions.deleteProduct(PRODUCT_ID)],
  ['updateStockStatus', () => actions.updateStockStatus(PRODUCT_ID, 'out_of_stock')],
  ['createProductImageUploadUrl', () => actions.createProductImageUploadUrl('x.jpg')],
  ['getDashboardStats', () => actions.getDashboardStats()],
]

describe('admin server actions: unauthenticated callers', () => {
  it.each(adminActions)('%s rejects', async (_name, call) => {
    mockGetCachedUser.mockResolvedValue({ user: null, error: null })
    await expect(call()).rejects.toThrow('Not authenticated')
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })
})

describe('admin server actions: café managers', () => {
  it.each(adminActions)('%s rejects a café manager', async (_name, call) => {
    asUser(CAFE_ID, { role: 'cafe_manager' })
    await expect(call()).rejects.toThrow('Not authorized')
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })
})

describe('admin server actions: a signed-up user with no café profile', () => {
  // This is the regression that matters. assertAdmin used to treat "has no row
  // in cafes" as proof of being an admin. Sign-up is open and onboarding is a
  // separate step, so anyone could register, stop before onboarding, and call
  // these actions directly — each of which runs on the service-role client.
  it.each(adminActions)('%s rejects an un-onboarded user', async (_name, call) => {
    asUser('44444444-4444-4444-8444-444444444444', {})
    await expect(call()).rejects.toThrow('Not authorized')
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })
})

describe('admin server actions: a real admin', () => {
  it('is let through to the service-role client', async () => {
    asUser(CAFE_ID, { role: 'admin' })
    // Reaching the (throwing) mock proves authorisation passed.
    await expect(actions.getCafes()).rejects.toThrow('service-role client must not be reachable')
    expect(mockCreateAdminClient).toHaveBeenCalled()
  })

  it('rejects a malformed id before it reaches the database', async () => {
    asUser(CAFE_ID, { role: 'admin' })
    mockCreateAdminClient.mockImplementation(() => ({}) as never)

    await expect(actions.approveCafe('not-a-uuid')).resolves.toEqual({ error: 'Invalid café id.' })
    await expect(actions.deleteOrder('../../etc/passwd')).resolves.toEqual({ error: 'Invalid order id.' })
    await expect(actions.getAdminOrder('1 OR 1=1')).resolves.toBeNull()
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })

  it('rejects a stock status outside the allowed enum', async () => {
    asUser(CAFE_ID, { role: 'admin' })
    mockCreateAdminClient.mockImplementation(() => ({}) as never)

    const result = await actions.updateStockStatus(
      PRODUCT_ID,
      'discontinued' as never,
    )

    expect(result.error).toBeTruthy()
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })
})
