import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/supabase/user'

// Marks a response as belonging to an authenticated page so browsers won't
// serve it from bfcache after sign-out — without this, pressing Back after
// signing out can show a stale copy of a protected page instead of /login.
function protect(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store, must-revalidate')
  return response
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Verifies the access token locally rather than calling the Auth API, so
  // this no longer costs a network round trip before the render even starts.
  // See lib/supabase/user.ts.
  const { user, error: getUserError } = await getAuthUser(supabase)

  const { pathname } = request.nextUrl
  const url = request.nextUrl

  // API routes, the OAuth callback, and the offline fallback handle their
  // own auth (or need none) — let them through after session refresh
  if (pathname.startsWith('/api') || pathname.startsWith('/auth') || pathname.startsWith('/offline')) {
    return supabaseResponse
  }

  // Supabase couldn't be reached at all (e.g. no internet) — that's not the
  // same as "not logged in". Redirecting to /login would both discard a
  // perfectly valid session and land on a page whose own assets may not load
  // either. Send the client to the self-contained offline page instead — a
  // client that's fully offline never gets this far (the service worker's
  // own fetch fallback catches it first); this covers the server-side leg,
  // e.g. Supabase being briefly unreachable from wherever this app runs.
  if (getUserError?.name === 'AuthRetryableFetchError') {
    return NextResponse.redirect(new URL('/offline', url))
  }

  // ── Unauthenticated ──────────────────────────────────────────────────────────
  if (!user) {
    if (!pathname.startsWith('/login') && !pathname.startsWith('/terms')) {
      return NextResponse.redirect(new URL('/login', url))
    }
    return supabaseResponse
  }

  // ── Authenticated ────────────────────────────────────────────────────────────

  // Already on /login → send to home
  if (pathname.startsWith('/login')) {
    const dest = user.app_metadata?.role === 'admin' ? '/admin' : '/'
    return NextResponse.redirect(new URL(dest, url))
  }

  // Admin (set via Supabase dashboard: app_metadata.role = "admin")
  const isAdmin = user.app_metadata?.role === 'admin'

  if (isAdmin) {
    if (!pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin', url))
    }
    return protect(supabaseResponse)
  }

  // ── Café user ────────────────────────────────────────────────────────────────
  // Whether the café is onboarded and approved used to be read from the
  // database right here, on every single request — a round trip that blocked
  // the render before it started, and that each page then repeated for the
  // same row. That gate now lives next to the data it protects
  // (lib/cafe/require-cafe.ts), and /onboarding and /pending route
  // themselves. Middleware makes no network calls at all any more.
  if (pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/', url))
  }

  return protect(supabaseResponse)
}
