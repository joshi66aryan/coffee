import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const url = request.nextUrl

  // API routes handle their own auth — let them through after session refresh
  if (pathname.startsWith('/api')) {
    return supabaseResponse
  }

  // ── Unauthenticated ──────────────────────────────────────────────────────────
  if (!user) {
    if (!pathname.startsWith('/login')) {
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
    return supabaseResponse
  }

  // ── Café user ────────────────────────────────────────────────────────────────
  const { data: cafe } = await supabase
    .from('cafes')
    .select('status')
    .eq('id', user.id)
    .single()

  // No profile → must complete onboarding
  if (!cafe) {
    if (!pathname.startsWith('/onboarding')) {
      return NextResponse.redirect(new URL('/onboarding', url))
    }
    return supabaseResponse
  }

  // Pending or rejected → show holding screen
  if (cafe.status === 'pending' || cafe.status === 'rejected') {
    if (!pathname.startsWith('/pending')) {
      return NextResponse.redirect(new URL('/pending', url))
    }
    return supabaseResponse
  }

  // Active café user — block restricted routes
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/pending')
  ) {
    return NextResponse.redirect(new URL('/', url))
  }

  return supabaseResponse
}
