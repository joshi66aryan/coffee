import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/server', () => ({
  NextResponse: { redirect: (url: string) => ({ redirectedTo: url }) },
}))
vi.mock('@/lib/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

const auth = {
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
}
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth }) }))

const mockResolve = vi.fn()
vi.mock('@/lib/cafe/auth-redirect', () => ({
  resolvePostAuthRedirect: (...args: unknown[]) => mockResolve(...args),
}))

const { GET } = await import('@/app/auth/confirm/route')

const USER_ID = '22222222-2222-4222-8222-222222222222'
const ORIGIN = 'https://sherpasips.example'

function request(query: string) {
  return new Request(`${ORIGIN}/auth/confirm${query}`)
}

async function redirectOf(query: string) {
  const response = (await GET(request(query))) as unknown as { redirectedTo: string }
  return response.redirectedTo
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.verifyOtp.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
  auth.exchangeCodeForSession.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
  mockResolve.mockResolvedValue({ redirect: '/' })
})

describe('/auth/confirm — verifying an emailed link', () => {
  // A token hash carries its own proof. A PKCE code needs the verifier cookie
  // from the browser that started the flow, which breaks the ordinary case of
  // signing up on a phone and opening the email on a laptop.
  it('verifies the token hash rather than requiring the originating browser', async () => {
    await redirectOf('?token_hash=abc123&type=signup')

    expect(auth.verifyOtp).toHaveBeenCalledWith({ type: 'signup', token_hash: 'abc123' })
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('sends a confirmed sign-up wherever that account belongs', async () => {
    mockResolve.mockResolvedValue({ redirect: '/onboarding' })

    await expect(redirectOf('?token_hash=abc123&type=signup')).resolves.toBe(`${ORIGIN}/onboarding`)
  })

  it('sends a recovery link to the page that finishes the reset', async () => {
    // Not through resolvePostAuthRedirect: that would drop someone with no
    // usable password onto the catalog.
    await expect(redirectOf('?token_hash=abc&type=recovery')).resolves.toBe(`${ORIGIN}/reset-password`)
    expect(mockResolve).not.toHaveBeenCalled()
  })

  it('honours an explicit next for a recovery link', async () => {
    await expect(redirectOf('?token_hash=abc&type=recovery&next=%2Freset-password')).resolves.toBe(
      `${ORIGIN}/reset-password`,
    )
  })

  it('still accepts a PKCE code when one is sent instead', async () => {
    await expect(redirectOf('?code=xyz')).resolves.toBe(`${ORIGIN}/`)
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('xyz')
  })
})

describe('/auth/confirm — rejecting what it should not follow', () => {
  it('refuses an off-site next rather than redirecting to it', async () => {
    await expect(
      redirectOf('?token_hash=abc&type=recovery&next=https%3A%2F%2Fevil.example%2Fsteal'),
    ).resolves.toBe(`${ORIGIN}/reset-password`)
  })

  it('refuses a protocol-relative next, which is not a local path', async () => {
    await expect(redirectOf('?token_hash=abc&type=recovery&next=%2F%2Fevil.example')).resolves.toBe(
      `${ORIGIN}/reset-password`,
    )
  })

  it('does not verify a token for an OTP type this app never sends', async () => {
    await expect(redirectOf('?token_hash=abc&type=phone_change')).resolves.toBe(`${ORIGIN}/login?error=link`)
    expect(auth.verifyOtp).not.toHaveBeenCalled()
  })

  it('sends an expired or reused link back to sign in with something to act on', async () => {
    auth.verifyOtp.mockResolvedValue({ data: { user: null }, error: { message: 'Token has expired' } })

    await expect(redirectOf('?token_hash=stale&type=signup')).resolves.toBe(`${ORIGIN}/login?error=link`)
  })

  it('does not establish a session when the code exchange fails', async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ data: { user: null }, error: { message: 'bad code' } })

    await expect(redirectOf('?code=xyz')).resolves.toBe(`${ORIGIN}/login?error=link`)
    expect(mockResolve).not.toHaveBeenCalled()
  })

  it('turns a link with no token at all away', async () => {
    await expect(redirectOf('')).resolves.toBe(`${ORIGIN}/login?error=link`)
    expect(auth.verifyOtp).not.toHaveBeenCalled()
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled()
  })
})
