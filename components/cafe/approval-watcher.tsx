'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const POLL_INTERVAL_MS = 5_000

// Polling only runs while the tab is actually being looked at. A café sits on
// this screen until an admin approves them — often for hours, usually in a
// backgrounded tab — and every poll costs a session validation plus a café
// lookup in middleware *and* again in the route handler. Checking on an
// invisible tab buys nothing: the visibilitychange handler below checks
// immediately when the user comes back, so a decision made while they were
// away still lands the moment they return.
export function ApprovalWatcher() {
  const router = useRouter()

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined

    async function check() {
      try {
        const res = await fetch('/api/cafe/status')
        if (!res.ok) return
        const { status } = await res.json()
        if (status === 'active') router.push('/')
        else if (status === 'rejected') router.refresh()
      } catch {
        // Network error — will retry on next interval
      }
    }

    function start() {
      if (interval !== undefined) return
      interval = setInterval(check, POLL_INTERVAL_MS)
    }

    function stop() {
      if (interval === undefined) return
      clearInterval(interval)
      interval = undefined
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void check()
        start()
      } else {
        stop()
      }
    }

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [router])

  return null
}
