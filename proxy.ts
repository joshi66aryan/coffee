import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * ── Why there is no CSRF token in this app ───────────────────────────────────
 *
 * Written down because "we looked at it and it's fine" is indistinguishable
 * from "nobody looked" six months later.
 *
 * Every state-changing operation here is a Next.js Server Action or a Route
 * Handler. There is no endpoint that mutates state on a GET, and no classic
 * HTML form POSTing to a handler of its own. Three things have to fail at once
 * before a cross-site request could act as a signed-in café:
 *
 * 1. Server Actions are POST-only and Next.js compares the request's `Origin`
 *    against the `Host` before dispatching one, rejecting the mismatch itself.
 *    A cross-site form post cannot suppress or forge `Origin`.
 *
 * 2. Supabase's session cookies are `SameSite=Lax` (the @supabase/ssr default,
 *    which nothing here overrides), so they are not attached to a cross-site
 *    POST at all. The request arrives unauthenticated, and `getAuthUser` in
 *    lib/supabase/user.ts turns it away before it reaches any query.
 *
 * 3. `form-action 'self'` and `frame-ancestors 'none'` in the CSP
 *    (next.config.ts) close the two flanking routes — submitting a form from
 *    an attacker's page to ours, and framing our page to click through it.
 *
 * The one thing that would invalidate this is adding a mutating Route Handler
 * that is reachable without a Server Action — a webhook receiver, or an API
 * endpoint a native client posts to. That endpoint would need its own origin
 * check or its own token, because (1) protects Server Actions specifically.
 * The one Route Handler that exists, /api/cafe/status, is a GET and reads.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|offline|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
