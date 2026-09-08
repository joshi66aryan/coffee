'use client'

import { ShoppingCart } from 'lucide-react'
import { EmptyState } from '@/components/cafe/empty-state'
import { useCart } from '@/lib/cafe/use-cart'
import { cartItemCount } from '@/lib/cafe/cart-store'
import { useIsHydrated } from '@/lib/ui/use-is-hydrated'

export function CartEmptyState() {
  const hydrated = useIsHydrated()
  const count = cartItemCount(useCart())

  // Stay hidden until the cart has actually been read on the client —
  // otherwise the server's empty cart would flash "your cart is empty" at
  // someone who has items.
  if (!hydrated || count > 0) return null

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
