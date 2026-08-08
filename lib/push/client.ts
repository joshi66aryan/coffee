// Browser-only helpers for enabling Web Push. Kept free of 'use client'
// directives since these are plain functions, not components.

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// VAPID public keys are URL-safe base64; the Push API needs a raw Uint8Array.
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function subscribeBrowserToPush(): Promise<PushSubscription> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!publicKey) throw new Error('Push notifications are not configured')

  // Safari requires requestPermission() to run as close to the triggering
  // user gesture as possible — awaiting service worker readiness first (as
  // Chrome/Firefox tolerate) causes Safari to silently deny the prompt.
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission denied')

  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready

  const existing = await registration.pushManager.getSubscription()
  if (existing) return existing

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  })
}

export async function unsubscribeBrowserFromPush(): Promise<string | null> {
  if (!('serviceWorker' in navigator)) return null
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return null

  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  return endpoint
}

// "Subscribed" must reflect this browser's actual push state, not just
// "does this account have a subscription row somewhere" — an account can
// have leftover rows from other devices/browsers that were never cleanly
// unsubscribed, which would otherwise make the toggle look stuck "on".
export async function hasBrowserPushSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  const subscription = await registration?.pushManager.getSubscription()
  return subscription != null
}
