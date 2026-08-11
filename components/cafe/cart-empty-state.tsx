'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart } from 'lucide-react'
import { EmptyState } from '@/components/cafe/empty-state'

export function CartEmptyState() {
  const [hasCart, setHasCart] = useState(true) // true until we know otherwise (avoids flash)

  useEffect(() => {
    function readCart() {
      try {
        const stored = localStorage.getItem('sherpa-cart')
        const qty: Record<string, number> = stored ? JSON.parse(stored) : {}
        const count = Object.values(qty).reduce((sum, n) => sum + n, 0)
        setHasCart(count > 0)
      } catch {
        setHasCart(false)
      }
    }
    readCart()
    window.addEventListener('storage', readCart)
    // Poll every 500ms to catch same-tab updates (e.g. CartSection removing the last item)
    const interval = setInterval(readCart, 500)
    return () => { window.removeEventListener('storage', readCart); clearInterval(interval) }
  }, [])

  if (hasCart) return null

  return (
    <EmptyState
      icon={ShoppingCart}
      title="Your cart is empty"
      description="Browse the collection and add beans to start an order."
      actionHref="/"
      actionLabel="Browse catalog"
    />
  )
}
