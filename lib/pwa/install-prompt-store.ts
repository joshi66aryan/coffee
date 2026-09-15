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

// iOS never gets an install button, and it is not a matter of the manifest
// being wrong. Apple requires every browser on the platform to run Safari's
// engine, and Safari has never fired 'beforeinstallprompt' — so Chrome,
// Firefox and Safari on an iPhone all report the site as uninstallable. The
// only route in is the Share sheet, done by hand.
//
// Which means the install UI cannot simply hide on iOS the way it does on a
// browser that just hasn't offered yet: hiding is what left iPhone cafés with
// no install affordance at all, and no hint that one exists.
let manualInstall: boolean | null = null

function isStandalone(): boolean {
  // An installed PWA is marked by the non-standard navigator.standalone on
  // iOS; everywhere else the display-mode query answers it.
  const nav = navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true
}

function isApplePlatform(): boolean {
  const ua = navigator.userAgent
  // iPadOS 13+ identifies itself as a Mac. Touch points are what separate an
  // iPad from a desktop Safari, which needs no manual instructions.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

export function getNeedsManualInstall(): boolean {
  if (typeof window === 'undefined') return false
  // Cached because useSyncExternalStore re-reads this on every render and
  // loops forever if the value it gets back is not identical.
  if (manualInstall === null) manualInstall = isApplePlatform() && !isStandalone()
  return manualInstall
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
  manualInstall = null
  listeners.clear()
}
