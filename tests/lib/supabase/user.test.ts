import { describe, it, expect, vi } from 'vitest'
import { getAuthUser } from '@/lib/supabase/user'

type ClaimsClient = Parameters<typeof getAuthUser>[0]

function clientWith(result: unknown): ClaimsClient {
  return { auth: { getClaims: vi.fn().mockResolvedValue(result) } } as unknown as ClaimsClient
}

describe('getAuthUser', () => {
  it('reads the user out of the access token claims', async () => {
    const { user, error } = await getAuthUser(
      clientWith({
        data: {
          claims: {
            sub: 'cafe-1',
            email: 'shop@example.com',
            app_metadata: { role: 'admin' },
          },
        },
        error: null,
      }),
    )

    expect(error).toBeNull()
    expect(user).toEqual({
      id: 'cafe-1',
      email: 'shop@example.com',
      app_metadata: { role: 'admin' },
    })
  })

  it('verifies the token without calling the Auth API', async () => {
    const getUser = vi.fn()
    const supabase = {
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: { claims: { sub: 'cafe-1', app_metadata: {} } },
          error: null,
        }),
        getUser,
      },
    } as unknown as ClaimsClient

    await getAuthUser(supabase)

    // The whole point of the change: no network round trip before the render.
    expect(getUser).not.toHaveBeenCalled()
  })

  it('treats a token with no email or metadata as a signed-in user all the same', async () => {
    const { user } = await getAuthUser(
      clientWith({ data: { claims: { sub: 'cafe-2' } }, error: null }),
    )

    expect(user).toEqual({ id: 'cafe-2', email: null, app_metadata: {} })
  })

  it('returns no user when there is no session', async () => {
    const { user, error } = await getAuthUser(clientWith({ data: null, error: null }))

    expect(user).toBeNull()
    expect(error).toBeNull()
  })

  it('surfaces the error so callers can tell an invalid token from an unreachable server', async () => {
    const authError = { name: 'AuthRetryableFetchError', message: 'fetch failed' }

    const { user, error } = await getAuthUser(clientWith({ data: null, error: authError }))

    expect(user).toBeNull()
    expect(error).toBe(authError)
  })
})
