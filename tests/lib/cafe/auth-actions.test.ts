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

const mockConsumeRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({
  consumeRateLimit: (...args: unknown[]) => mockConsumeRateLimit(...args),
  getClientIp: async () => '203.0.113.7',
  hashIdentifier: (value: string) => `hash(${value.trim().toLowerCase()})`,
  retryAfterMessage: () => 'Please try again in a minute.',
}))

// One shared auth double for the caller's session client, and a separate one
// for the no-cookie verification client — the distinction is the whole point of
// createVerificationClient, so the tests keep them apart too.
const auth = {
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resend: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  getUser: vi.fn(),
  getClaims: vi.fn(),
}
const verifierAuth = { signInWithPassword: vi.fn() }

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth, from: () => ({}) }),
  createVerificationClient: () => ({ auth: verifierAuth }),
}))

const actions = await import('@/lib/cafe/actions')

const USER_ID = '22222222-2222-4222-8222-222222222222'
const EMAIL = 'manager@basecamp.com.np'
const STRONG = 'Sherpa!Trail9'

beforeEach(() => {
  vi.clearAllMocks()
  mockConsumeRateLimit.mockResolvedValue({ allowed: true, retryAfter: 0 })
  mockGetCachedUser.mockResolvedValue({ user: { id: USER_ID, email: EMAIL, app_metadata: {} }, error: null })
  auth.signInWithPassword.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
  auth.signUp.mockResolvedValue({ data: { user: { id: USER_ID }, session: null }, error: null })
  auth.resend.mockResolvedValue({ error: null })
  auth.resetPasswordForEmail.mockResolvedValue({ error: null })
  auth.updateUser.mockResolvedValue({ error: null })
  auth.getUser.mockResolvedValue({
    data: { user: { id: USER_ID, email: EMAIL, identities: [{ provider: 'email' }] } },
    error: null,
  })
  verifierAuth.signInWithPassword.mockResolvedValue({ error: null })
})

describe('signInWithEmail — rate limiting', () => {
  it('meters the account without storing the address it meters', async () => {
    await actions.signInWithEmail(EMAIL, 'whatever123')

    expect(mockConsumeRateLimit).toHaveBeenCalledWith('signIn', `hash(${EMAIL})`)
    // The raw address is never handed to the counter.
    const keys = mockConsumeRateLimit.mock.calls.map(call => call[1])
    expect(keys).not.toContain(EMAIL)
  })

  it('also meters the source address, which the account key cannot see', async () => {
    // One host spraying a single password across many accounts never trips an
    // account-scoped counter.
    await actions.signInWithEmail(EMAIL, 'whatever123')

    expect(mockConsumeRateLimit).toHaveBeenCalledWith('signInIp', '203.0.113.7')
  })

  it('refuses without touching the auth API once the account limit is spent', async () => {
    mockConsumeRateLimit.mockResolvedValue({ allowed: false, retryAfter: 60 })

    const result = await actions.signInWithEmail(EMAIL, 'whatever123')

    expect(result.error).toMatch(/too many sign-in attempts/i)
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
  })
})

describe('signInWithEmail — what a failure is allowed to reveal', () => {
  it('gives the same answer for a wrong password as for an address with no account', async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    })

    const result = await actions.signInWithEmail(EMAIL, 'wrongpassword')

    expect(result.error).toBe('Invalid email or password.')
    expect(result.needsConfirmation).toBeUndefined()
  })

  it('never logs the address that was tried', async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    })

    await actions.signInWithEmail(EMAIL, 'wrongpassword')

    expect(JSON.stringify(mockLogger.error.mock.calls)).not.toContain(EMAIL)
  })

  // Supabase only returns this code once the password itself has checked out,
  // so it discloses nothing to anyone who does not already hold the credential
  // — and collapsing it was what left a café with a correct password staring at
  // "Invalid email or password" and no way forward.
  it('tells a caller with the right password that the address is unconfirmed', async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { code: 'email_not_confirmed', message: 'Email not confirmed' },
    })

    const result = await actions.signInWithEmail(EMAIL, STRONG)

    expect(result.needsConfirmation).toBe(true)
    expect(result.error).toMatch(/has not been confirmed/i)
  })

  it('recognises the unconfirmed case from the message when no code is present', async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Email not confirmed' },
    })

    await expect(actions.signInWithEmail(EMAIL, STRONG)).resolves.toMatchObject({
      needsConfirmation: true,
    })
  })
})

describe('signUpWithEmail — confirmation links point at this deployment', () => {
  it('supplies an explicit redirect rather than inheriting the project Site URL', async () => {
    await actions.signUpWithEmail(EMAIL, STRONG)

    expect(auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { emailRedirectTo: 'https://sherpasips.example/auth/confirm?next=%2F' },
      }),
    )
  })

  it('still refuses to say whether the address was already registered', async () => {
    auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'user_already_exists', message: 'User already registered' },
    })

    await expect(actions.signUpWithEmail(EMAIL, STRONG)).resolves.toEqual({
      error: 'Could not create the account. Please try again.',
    })
  })

  it('rejects a weak password before any account is created', async () => {
    const result = await actions.signUpWithEmail(EMAIL, 'password')

    expect(result).toHaveProperty('error')
    expect(auth.signUp).not.toHaveBeenCalled()
  })
})

describe('requestPasswordReset', () => {
  it('sends the caller to the reset page, on this deployment', async () => {
    await actions.requestPasswordReset(EMAIL)

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(EMAIL, {
      redirectTo: 'https://sherpasips.example/auth/confirm?next=%2Freset-password',
    })
  })

  it('reports success even when the address has no account', async () => {
    // Anything else turns this form into a "does this café bank here?" oracle.
    auth.resetPasswordForEmail.mockResolvedValue({
      error: { code: 'user_not_found', message: 'User not found' },
    })

    await expect(actions.requestPasswordReset(EMAIL)).resolves.toEqual({ sent: true })
  })

  it('is metered per account and per source', async () => {
    await actions.requestPasswordReset(EMAIL)

    expect(mockConsumeRateLimit).toHaveBeenCalledWith('passwordReset', `hash(${EMAIL})`)
    expect(mockConsumeRateLimit).toHaveBeenCalledWith('passwordReset', 'ip:203.0.113.7')
  })

  it('sends no mail once the limit is spent', async () => {
    mockConsumeRateLimit.mockResolvedValue({ allowed: false, retryAfter: 900 })

    const result = await actions.requestPasswordReset(EMAIL)

    expect(result.error).toMatch(/too many requests/i)
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('rejects a malformed address without calling the auth API', async () => {
    const result = await actions.requestPasswordReset('not-an-email')

    expect(result).toHaveProperty('error')
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled()
  })
})

describe('resendConfirmationEmail', () => {
  it('reports success regardless of what Supabase says', async () => {
    auth.resend.mockResolvedValue({ error: { message: 'User not found' } })

    await expect(actions.resendConfirmationEmail(EMAIL)).resolves.toEqual({ sent: true })
  })

  it('is metered per account', async () => {
    await actions.resendConfirmationEmail(EMAIL)

    expect(mockConsumeRateLimit).toHaveBeenCalledWith('resendConfirmation', `hash(${EMAIL})`)
  })
})

describe('changePassword — re-authentication', () => {
  it('verifies the current password before setting a new one', async () => {
    await actions.changePassword('oldpass123', STRONG)

    expect(verifierAuth.signInWithPassword).toHaveBeenCalledWith({
      email: EMAIL,
      password: 'oldpass123',
    })
    expect(auth.updateUser).toHaveBeenCalledWith({ password: STRONG })
  })

  it('checks the old password on a client that cannot overwrite the session', async () => {
    await actions.changePassword('oldpass123', STRONG)

    // The caller's own client must never be used for the challenge: a
    // successful signInWithPassword there would mint and persist new cookies.
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('refuses when the current password is wrong, and does not update', async () => {
    verifierAuth.signInWithPassword.mockResolvedValue({
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    })

    const result = await actions.changePassword('wrong', STRONG)

    expect(result).toEqual({ error: 'Your current password is not correct.' })
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it('refuses when no current password is offered at all', async () => {
    const result = await actions.changePassword('', STRONG)

    expect(result).toEqual({ error: 'Enter your current password.' })
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  // A session alone must not be enough to change the password it is protected
  // by — that would let anyone reaching an unlocked browser lock the owner out.
  it('never updates on the strength of a session alone', async () => {
    verifierAuth.signInWithPassword.mockResolvedValue({ error: { message: 'nope' } })

    await actions.changePassword('guess', STRONG)

    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it('rejects a weak new password before challenging anything', async () => {
    const result = await actions.changePassword('oldpass123', 'short')

    expect(result).toHaveProperty('error')
    expect(verifierAuth.signInWithPassword).not.toHaveBeenCalled()
  })
})

describe('changePassword — an account with no password yet', () => {
  beforeEach(() => {
    auth.getUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: EMAIL, identities: [{ provider: 'google' }] } },
      error: null,
    })
  })

  it('sets a first password without a challenge there is nothing to answer', async () => {
    const result = await actions.changePassword('', STRONG)

    expect(result).toEqual({ success: true })
    expect(verifierAuth.signInWithPassword).not.toHaveBeenCalled()
    expect(auth.updateUser).toHaveBeenCalledWith({ password: STRONG })
  })
})

describe('completePasswordReset — only a recovery link may skip the challenge', () => {
  function claims(amr: { method: string; timestamp: number }[]) {
    auth.getClaims.mockResolvedValue({
      data: { claims: { sub: USER_ID, amr } },
      error: null,
    })
  }

  const now = () => Math.floor(Date.now() / 1000)

  it('sets the password for a session minted by a recovery link', async () => {
    claims([{ method: 'recovery', timestamp: now() - 30 }])

    await expect(actions.completePasswordReset(STRONG)).resolves.toEqual({ success: true })
    expect(auth.updateUser).toHaveBeenCalledWith({ password: STRONG })
  })

  // The danger this closes: an attacker on an already signed-in browser
  // navigating straight to /reset-password to set a password they know,
  // bypassing the current-password challenge on the settings form.
  it('refuses an ordinary password session', async () => {
    claims([{ method: 'password', timestamp: now() - 30 }])

    const result = await actions.completePasswordReset(STRONG)

    expect(result.error).toMatch(/expired/i)
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it('refuses a Google session', async () => {
    claims([{ method: 'oauth', timestamp: now() - 30 }])

    await expect(actions.completePasswordReset(STRONG)).resolves.toHaveProperty('error')
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it('refuses a recovery that happened too long ago to still be this visit', async () => {
    claims([{ method: 'recovery', timestamp: now() - 60 * 60 }])

    await expect(actions.completePasswordReset(STRONG)).resolves.toHaveProperty('error')
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it('refuses when the token carries no authentication history at all', async () => {
    auth.getClaims.mockResolvedValue({ data: { claims: { sub: USER_ID } }, error: null })

    await expect(actions.completePasswordReset(STRONG)).resolves.toHaveProperty('error')
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it('refuses when there is no session to read', async () => {
    auth.getClaims.mockResolvedValue({ data: null, error: { message: 'no session' } })

    await expect(actions.completePasswordReset(STRONG)).resolves.toHaveProperty('error')
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it('rejects a weak password even on a valid recovery session', async () => {
    claims([{ method: 'recovery', timestamp: now() - 30 }])

    const result = await actions.completePasswordReset('short')

    expect(result).toHaveProperty('error')
    expect(auth.updateUser).not.toHaveBeenCalled()
  })
})
