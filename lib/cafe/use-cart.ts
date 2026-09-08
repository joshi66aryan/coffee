'use client'

import { useSyncExternalStore } from 'react'
import {
  getCartSnapshot,
  getServerCartSnapshot,
  subscribeToCart,
  type CartQuantities,
} from '@/lib/cafe/cart-store'

/**
 * The current cart, kept in sync with every other component reading it.
 *
 * `useSyncExternalStore` is what makes this safe during SSR: it renders the
 * server snapshot (an empty cart) for the hydration pass and swaps in the real
 * localStorage value afterwards, without the setState-in-an-effect cascade the
 * previous implementations used.
 */
export function useCart(): CartQuantities {
  return useSyncExternalStore(subscribeToCart, getCartSnapshot, getServerCartSnapshot)
}
