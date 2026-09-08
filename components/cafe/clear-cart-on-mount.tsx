'use client'

import { useEffect } from 'react'
import { clearCart } from '@/lib/cafe/cart-store'

// Runs on the order confirmation page instead of the cart page — by the time
// this mounts, the cart page is already unmounted, so there's no window for
// its empty-cart state to flash before navigation finishes.
export function ClearCartOnMount() {
  useEffect(() => {
    clearCart()
  }, [])

  return null
}
