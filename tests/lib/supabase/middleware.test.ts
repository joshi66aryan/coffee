import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// The middleware reads the user from the access token's claims rather than
// calling the Auth API — see lib/supabase/user.ts.
const mockGetClaims = vi.fn()
// Middleware must not touch the database — `from` is here purely so the tests
// can prove it is never called.
const mockFrom = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getClaims: mockGetClaims },
    from: mockFrom,
  }),
}))

function signedInAs(role?: string) {
  mockGetClaims.mockResolvedValue({
    data: { claims: { sub: 'user-1', app_metadata: role ? { role } : {} } },
    error: null,
  })
}

import { updateSession } from '@/lib/supabase/middleware'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('updateSession — offline vs. logged-out', () => {
  it('redirects to /offline (not /login) when Supabase cannot be reached at all', async () => {
    mockGetClaims.mockResolvedValue({
      data: null,
      error: { name: 'AuthRetryableFetchError', message: 'fetch failed' },
    })

    const response = await updateSession(new NextRequest('http://localhost:3000/'))

    expect(response.headers.get('location')).toContain('/offline')
  })

  it('redirects to /login when there is genuinely no user and no network error', async () => {
    mockGetClaims.mockResolvedValue({ data: null, error: null })

    const response = await updateSession(new NextRequest('http://localhost:3000/'))

    expect(response.headers.get('location')).toContain('/login')
  })

  it('lets /offline itself through without redirecting anywhere', async () => {
    mockGetClaims.mockResolvedValue({
      data: null,
      error: { name: 'AuthRetryableFetchError', message: 'fetch failed' },
    })

    const response = await updateSession(new NextRequest('http://localhost:3000/offline'))

    expect(response.headers.get('location')).toBeNull()
  })

  it('does not treat an actual API auth error (e.g. invalid session) as offline', async () => {
    mockGetClaims.mockResolvedValue({
      data: null,
      error: { name: 'AuthApiError', message: 'invalid JWT' },
    })

    const response = await updateSession(new NextRequest('http://localhost:3000/'))

    expect(response.headers.get('location')).toContain('/login')
  })
})

describe('updateSession — routing without a database call', () => {
  it('lets an approved café through without querying anything', async () => {
    signedInAs()

    const response = await updateSession(new NextRequest('http://localhost:3000/'))

    expect(response.headers.get('location')).toBeNull()
    // The café-status lookup used to run here, on every single request.
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('marks authenticated pages no-store so Back cannot replay them after sign-out', async () => {
    signedInAs()

    const response = await updateSession(new NextRequest('http://localhost:3000/orders'))

    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('keeps café users out of the admin area', async () => {
    signedInAs()

    const response = await updateSession(new NextRequest('http://localhost:3000/admin/orders'))

    expect(response.headers.get('location')).toContain('/')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('sends an admin to the admin area, using only the role claim', async () => {
    signedInAs('admin')

    const response = await updateSession(new NextRequest('http://localhost:3000/orders'))

    expect(response.headers.get('location')).toContain('/admin')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('sends an already-signed-in visitor away from the login page', async () => {
    signedInAs()

    const response = await updateSession(new NextRequest('http://localhost:3000/login'))

    expect(response.headers.get('location')).toContain('/')
  })
})
