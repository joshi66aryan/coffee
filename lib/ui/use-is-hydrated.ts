'use client'

import { useSyncExternalStore } from 'react'

// Never changes after the first client render, so there is nothing to
// subscribe to — React itself re-renders once when it swaps the server
// snapshot for the client one.
const subscribe = () => () => {}
const getSnapshot = () => true
const getServerSnapshot = () => false

/**
 * False during SSR and the hydration render, true afterwards.
 *
 * For UI that must not appear until a browser-only value has been read
 * (a localStorage dismissal flag, `Notification.permission`), this replaces
 * the `useState(...)` + `useEffect(() => setState(...))` pattern, which
 * triggers a second render pass through an effect on every mount.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
