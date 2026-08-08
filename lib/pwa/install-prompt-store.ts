'use client'

// Non-standard Chrome/Edge/Android event — not in lib.dom.d.ts.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Listener = (canInstall: boolean) => void

let deferredPrompt: BeforeInstallPromptEvent | null = null
let installed = false
const listeners = new Set<Listener>()

function notify() {
  const canInstall = deferredPrompt !== null && !installed
  listeners.forEach(listener => listener(canInstall))
}

function handleBeforeInstallPrompt(event: Event) {
  event.preventDefault()
  deferredPrompt = event as BeforeInstallPromptEvent
  notify()
}

function handleAppInstalled() {
  installed = true
  deferredPrompt = null
  notify()
}

// Attached once here at module scope, not inside each component's own
// effect — 'beforeinstallprompt' fires at most once per page load, so
// listening from wherever happens to be mounted at that moment means
// whichever UI wasn't on screen yet (e.g. the Settings row, reached via
// client-side navigation after the event already fired on the home page)
// would silently never learn the site is installable. Imported for its
// side effect from ServiceWorkerRegister in the root layout so this runs
// from the very first page load, before any install-UI component exists.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleAppInstalled)
}

export function getCanInstall(): boolean {
  return deferredPrompt !== null && !installed
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable'
  await deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  notify()
  return outcome
}

// Test-only: this module's state is a singleton that otherwise persists
// across every test in the same file, since ES modules are evaluated once
// and cached per test file.
export function __resetInstallPromptStoreForTests(): void {
  deferredPrompt = null
  installed = false
  listeners.clear()
}
