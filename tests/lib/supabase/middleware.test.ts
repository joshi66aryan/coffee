import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// The middleware reads the user from the access token's claims rather than
// calling the Auth API — see lib/supabase/user.ts.
const mockGetClaims = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getClaims: mockGetClaims },
  }),
}))

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
