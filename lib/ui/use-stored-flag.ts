'use client'

import { useSyncExternalStore } from 'react'

// localStorage fires 'storage' only for writes made by *other* tabs, which is
// all this needs: components that write their own flag track that write in
// local state. Subscribing at all is what lets a dismissal in one tab hide
// the same banner in another.
function subscribe(listener: () => void): () => void {
  window.addEventListener('storage', listener)
  return () => window.removeEventListener('storage', listener)
}

/**
 * A localStorage value, read during render instead of through a
 * `useState` + `useEffect(() => setState(...))` pair.
 *
 * The value is a string, so `useSyncExternalStore` compares it by value and
 * the referential-stability trap that applies to object snapshots doesn't
 * arise here. Returns null on the server and during hydration.
 */
export function useStoredFlag(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key)
      } catch {
        return null
      }
    },
    () => null,
  )
}
