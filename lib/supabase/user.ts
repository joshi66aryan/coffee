import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { AuthError, SupabaseClient, UserAppMetadata } from '@supabase/supabase-js'

/**
 * The only parts of the authenticated user this app uses: the café/admin id
 * that scopes every query, the address shown on the settings page, and the
 * role that gates admin routes. All three are claims in the access token, so
 * none of them needs a call to the Auth API.
 */
export interface AuthUser {
  id: string
  email: string | null
  app_metadata: UserAppMetadata
}

/** Any Supabase client — server, middleware, or a test double. */
interface ClaimsClient {
  auth: { getClaims: SupabaseClient['auth']['getClaims'] }
}

/**
 * The authenticated user for a request, read from the access token.
 *
 * `getClaims()` verifies the JWT locally against the project's JWKS (cached
 * after the first fetch), so it costs no network round trip — where
 * `getUser()` always called the Auth API and blocked the render on it. Auth
 * was the single largest cost in a page load: middleware and the page each
 * paid ~600ms for a check that returned no data.
 *
 * Two caveats worth knowing:
 * - With a *symmetric* JWT secret there is no public key to verify against,
 *   so Supabase falls back to a server call. The saving only lands once the
 *   project is migrated to asymmetric signing keys (dashboard → JWT Keys).
 * - If the token is close to expiry the session is refreshed first, which is
 *   a network call — but that happens once an hour, not once a request.
 */
export async function getAuthUser(
  supabase: ClaimsClient,
): Promise<{ user: AuthUser | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.getClaims()

  if (error) return { user: null, error }
  if (!data) return { user: null, error: null }

  const { sub, email, app_metadata } = data.claims

  return {
    user: { id: sub, email: email ?? null, app_metadata: app_metadata ?? {} },
    error: null,
  }
}

/**
 * The authenticated user for the current server request.
 *
 * React's `cache()` scopes the result to one request, so a page that fans out
 * into several Server Actions still resolves the user once. Middleware runs in
 * its own request context and is deliberately not covered by this — it does
 * its own check, which is now local anyway.
 */
export const getCachedUser = cache(
  async (): Promise<{ user: AuthUser | null; error: AuthError | null }> => {
    const supabase = await createClient()
    return getAuthUser(supabase)
  },
)
