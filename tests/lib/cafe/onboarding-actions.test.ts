import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, cache: <T,>(fn: T) => fn }
})

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
vi.mock('@/lib/logger', () => ({ default: mockLogger }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/site-url', () => ({ getSiteOrigin: async () => 'https://sherpasips.example' }))
vi.mock('@/lib/cafe/auth-redirect', () => ({
  resolvePostAuthRedirect: async () => ({ redirect: '/' }),
}))

const mockGetCachedUser = vi.fn()
vi.mock('@/lib/supabase/user', () => ({ getCachedUser: () => mockGetCachedUser() }))

const signOut = vi.fn()
const existingProfile = vi.fn()
const insert = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { signOut },
    from: () => ({
      select: () => ({ eq: () => ({ single: existingProfile }) }),
      insert,
    }),
  }),
  createVerificationClient: () => ({ auth: {} }),
}))

// Imported dynamically: `vi.mock` factories are hoisted above the file's own
// declarations, so a static import would run them before the doubles above
// exist. Same reason as tests/lib/cafe/auth-actions.test.ts.
const { createCafeProfile } = await import('@/lib/cafe/actions')

const USER_ID = '0ef96112-6d73-47d4-8449-b726a835f19b'

function onboardingForm() {
  const form = new FormData()
  form.set('name', 'Himalayan Brew')
  form.set('contact_name', 'Aryan')
  form.set('phone', '9800000000')
  form.set('neighborhood', 'Thamel')
  form.set('delivery_address', 'Thamel Marg 12, Kathmandu')
  return form
}

describe('createCafeProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCachedUser.mockResolvedValue({ user: { id: USER_ID }, error: null })
    existingProfile.mockResolvedValue({ data: null })
  })

  it('creates the profile and sends the café to the pending page', async () => {
    insert.mockResolvedValue({ error: null })

    expect(await createCafeProfile(onboardingForm())).toEqual({ redirect: '/pending' })
    expect(signOut).not.toHaveBeenCalled()
  })

  // An admin deleted the café while its browser was still signed in. The token
  // is signed and unexpired, so it passes local verification; only the database
  // knows the account is gone, and it says so as a foreign key violation.
  describe('when the signed-in account no longer exists', () => {
    beforeEach(() => {
      insert.mockResolvedValue({
        error: {
          code: '23503',
          message: 'insert or update on table "cafes" violates foreign key constraint "cafes_id_fkey"',
        },
      })
    })

    it('ends the dead session instead of asking them to try again', async () => {
      const result = await createCafeProfile(onboardingForm())

      expect(signOut).toHaveBeenCalledOnce()
      expect(result).toEqual({ redirect: '/login?error=account-removed' })
      expect(result).not.toHaveProperty('error')
    })

    it('records it as expected rather than as a failure needing investigation', async () => {
      await createCafeProfile(onboardingForm())

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Onboarding attempted with a deleted account',
        { userId: USER_ID },
      )
      expect(mockLogger.error).not.toHaveBeenCalled()
    })
  })

  // Any other write failure is still worth retrying, so it must keep the
  // session and the retryable message.
  it('keeps the session for an unrelated database failure', async () => {
    insert.mockResolvedValue({ error: { code: '08006', message: 'connection failure' } })

    const result = await createCafeProfile(onboardingForm())

    expect(signOut).not.toHaveBeenCalled()
    expect(result).toEqual({ error: 'Failed to save your profile. Please try again.' })
    expect(mockLogger.error).toHaveBeenCalled()
  })

  it('sends an already-onboarded café to the page matching its status', async () => {
    existingProfile.mockResolvedValue({ data: { status: 'active' } })

    expect(await createCafeProfile(onboardingForm())).toEqual({ redirect: '/' })
    expect(insert).not.toHaveBeenCalled()
  })
})
