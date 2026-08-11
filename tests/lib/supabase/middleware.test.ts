import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}))

import { updateSession } from '@/lib/supabase/middleware'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('updateSession — offline vs. logged-out', () => {
  it('redirects to /offline (not /login) when Supabase cannot be reached at all', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { name: 'AuthRetryableFetchError', message: 'fetch failed' },
    })

    const response = await updateSession(new NextRequest('http://localhost:3000/'))

    expect(response.headers.get('location')).toContain('/offline')
  })

  it('redirects to /login when there is genuinely no user and no network error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const response = await updateSession(new NextRequest('http://localhost:3000/'))

    expect(response.headers.get('location')).toContain('/login')
  })

  it('lets /offline itself through without redirecting anywhere', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { name: 'AuthRetryableFetchError', message: 'fetch failed' },
    })

    const response = await updateSession(new NextRequest('http://localhost:3000/offline'))

    expect(response.headers.get('location')).toBeNull()
  })

  it('does not treat an actual API auth error (e.g. invalid session) as offline', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { name: 'AuthApiError', message: 'invalid JWT' },
    })

    const response = await updateSession(new NextRequest('http://localhost:3000/'))

    expect(response.headers.get('location')).toContain('/login')
  })
})
