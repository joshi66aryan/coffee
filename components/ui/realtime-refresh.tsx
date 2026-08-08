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
const FALLBACK_POLL_MS = 20_000

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

    for (const t of tables) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: t, filter },
        () => router.refresh(),
      )
    }

    channel.subscribe()
    const interval = setInterval(() => router.refresh(), FALLBACK_POLL_MS)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, filter])

  return null
}
