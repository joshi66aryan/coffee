'use client'

import { useEffect } from 'react'

// Runs on the order confirmation page instead of the cart page — by the time
// this mounts, the cart page is already unmounted, so there's no window for
// its empty-cart state to flash before navigation finishes.
export function ClearCartOnMount() {
  useEffect(() => {
    try {
      localStorage.removeItem('sherpa-cart')
    } catch {}
  }, [])

  return null
}
