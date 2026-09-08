'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface RealtimeRefreshProps {
  table: string | string[]
  filter?: string
}

// A silent connection failure (missing publication entry, blocked
// WebSocket, network hiccup) would otherwise mean changes never show up at
// all — this bounds the worst case to one polling interval instead.
//
// It runs *only* while the channel is not in the SUBSCRIBED state. When
// Realtime is healthy — the normal case — every change already arrives as an
// event, so polling on top of it just re-ran each page's full server render
// and its database queries every 20s, per open tab, forever.
const FALLBACK_POLL_MS = 20_000

// `router.refresh()` re-runs every query on the page, so one refresh per row
// changed is expensive: an admin marking five orders delivered, or a catalog
// import, arrives as a burst of events. Collecting them into a single refresh
// costs a barely perceptible delay and saves the repeated render.
const COALESCE_MS = 250

// Subscribes to Supabase Realtime postgres_changes for one or more tables and
// refetches the current Server Component on any insert/update/delete — the
// live-data equivalent of a manual page refresh, without the polling delay.
export function RealtimeRefresh({ table, filter }: RealtimeRefreshProps) {
  const router = useRouter()
  const tables = Array.isArray(table) ? table : [table]
  const key = tables.join(',')

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`realtime-refresh:${key}:${filter ?? 'all'}`)

    let pendingRefresh = false
    let coalesceTimer: ReturnType<typeof setTimeout> | undefined

    // Refreshing a hidden tab renders a page nobody is looking at, so a
    // backgrounded tab holds its pending refresh until it is shown again.
    function flushRefresh() {
      coalesceTimer = undefined
      if (!pendingRefresh || document.hidden) return
      pendingRefresh = false
      router.refresh()
    }

    function requestRefresh() {
      pendingRefresh = true
      if (coalesceTimer !== undefined) return
      coalesceTimer = setTimeout(flushRefresh, COALESCE_MS)
    }

    function handleVisibilityChange() {
      if (!document.hidden) flushRefresh()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    for (const t of key.split(',')) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: t, filter },
        requestRefresh,
      )
    }

    let interval: ReturnType<typeof setInterval> | undefined

    function startPolling() {
      if (interval !== undefined) return
      interval = setInterval(requestRefresh, FALLBACK_POLL_MS)
    }

    function stopPolling() {
      if (interval === undefined) return
      clearInterval(interval)
      interval = undefined
    }

    // Poll only while the subscription is unhealthy. `subscribe` reports
    // SUBSCRIBED on success and CHANNEL_ERROR / TIMED_OUT / CLOSED otherwise,
    // and is called again on every reconnect attempt — so the fallback turns
    // itself on and off as the connection comes and goes.
    channel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        stopPolling()
      } else {
        startPolling()
      }
    })

    // Until the first status callback arrives the connection is unproven —
    // poll so a channel that never connects at all is still covered.
    startPolling()

    return () => {
      supabase.removeChannel(channel)
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (coalesceTimer !== undefined) clearTimeout(coalesceTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, filter])

  return null
}
