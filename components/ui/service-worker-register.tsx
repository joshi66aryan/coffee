'use client'

import { useEffect } from 'react'
// Side-effect import: attaches the shared 'beforeinstallprompt' listener
// (see lib/pwa/install-prompt-store.ts) from the root layout, so it's
// active from the very first page load rather than only once some
// install-UI component happens to mount.
import '@/lib/pwa/install-prompt-store'

// Registered unconditionally on every page load — unlike the lazy,
// opt-in registration in lib/push/client.ts (gated behind enabling
// notifications), installability and offline caching need the worker
// active before a user ever touches notification settings. Registering
// the same script/scope twice is a no-op, so this coexists safely with
// the push opt-in path re-registering later.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  return null
}
