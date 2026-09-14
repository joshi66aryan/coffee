'use client'

import { useEffect } from 'react'
import { adoptSessionOwner } from '@/lib/ui/app-storage'
import { notifyCartChanged } from '@/lib/cafe/cart-store'

/**
 * Ties the browser's stored state to the account that is actually signed in.
 *
 * The cart and the various dismissal flags live in localStorage, which outlives
 * both the session and the account. Signing out never cleared them, so on a
 * shared browser the next café to sign in inherited the previous one's cart —
 * and could place an order for items nobody chose.
 *
 * Mounted once per layout rather than pushed into each of the six components
 * that read the cart: this is the only place that needs to know who is signed
 * in, and the store's own API is unchanged.
 *
 * Runs in an effect, so a stale cart can in principle paint for a single frame
 * before being cleared. Clearing during render is not an option — it is a write
 * to a browser global, and React may render a component more than once per
 * commit.
 */
export function SessionScope({ userId }: { userId: string }) {
  useEffect(() => {
    // The cart is read through useSyncExternalStore, which has no idea the
    // underlying key was removed unless the store says so.
    if (adoptSessionOwner(userId)) notifyCartChanged()
  }, [userId])

  return null
}
