'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const POLL_INTERVAL_MS = 15_000

export function CafesRealtime() {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [router])

  return null
}
