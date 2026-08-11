'use client'

import { useEffect } from 'react'

// The Cache-Control: no-store header set in lib/supabase/middleware.ts asks
// browsers not to bfcache protected pages, but that's a request, not a
// guarantee — Chrome has been observed keeping pages in bfcache regardless
// (see the "Page entered Back-Forward Cache" console message) especially in
// dev with an open HMR WebSocket. Without this, pressing Back after sign-out
// can briefly show the stale, still-signed-in page instead of /login.
// `pageshow` with `event.persisted` fires whenever a page is restored from
// bfcache; forcing a real reload guarantees a fresh request through the
// middleware, which will redirect to /login if the session is gone.
export function BfcacheReload() {
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        window.location.reload()
      }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  return null
}
