'use client'

import { useSyncExternalStore } from 'react'
import {
  getCanInstall,
  getNeedsManualInstall,
  subscribe,
  promptInstall,
} from '@/lib/pwa/install-prompt-store'

// Safari/iOS never fires 'beforeinstallprompt' at all (no native prompt API
// there — install is manual, via the share sheet), so canInstall simply
// stays false on those browsers and `needsManualInstall` covers them instead.
//
// `useSyncExternalStore` rather than useState(getCanInstall) + useEffect, and
// the third argument is the whole reason. The store attaches its listener at
// module scope from the root layout (see install-prompt-store.ts), precisely so
// the event isn't missed — which means 'beforeinstallprompt' routinely fires
// *before* React hydrates. A plain `useState(getCanInstall)` initialiser then
// reads `true` during the hydration render while the server had rendered
// nothing, and React throws a hydration mismatch for the whole subtree.
//
// The server snapshot is returned for both SSR and the hydration render, so the
// client's first pass matches the HTML exactly; React re-renders once
// afterwards with the real value, which is when the banner appears.
export function useInstallPrompt() {
  const canInstall = useSyncExternalStore(subscribe, getCanInstall, () => false)
  // True on iPhone/iPad, where there is no prompt to defer and the install has
  // to be described rather than offered. Read through the same store so it is
  // likewise absent from the server render and the hydration pass.
  const needsManualInstall = useSyncExternalStore(subscribe, getNeedsManualInstall, () => false)

  return { canInstall, needsManualInstall, promptInstall }
}
