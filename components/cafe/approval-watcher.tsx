'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const POLL_INTERVAL_MS = 5_000

export function ApprovalWatcher() {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/cafe/status')
        if (!res.ok) return
        const { status } = await res.json()
        if (status === 'active') router.push('/')
        else if (status === 'rejected') router.refresh()
      } catch {
        // Network error — will retry on next interval
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [router])

  return null
}
