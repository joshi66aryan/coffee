// Minimal service worker: receives Web Push events and shows a notification.
// Not a full PWA — no offline caching or asset precaching here.

// Take over immediately on update instead of waiting for every open tab to
// close first — this file changes during active development, and a stale
// cached worker would keep serving old push/click behavior otherwise.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }

  const title = data.title || 'Sherpa Sips'
  const options = {
    body: data.body || '',
    data: { url: data.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/'
  const target = new URL(url, self.location.origin).href

  // Safari requires opening/focusing a window to happen essentially
  // immediately in response to the click — checking existing clients first
  // (via clients.matchAll(), an extra async hop) makes Safari silently drop
  // the action, so this goes straight for openWindow()/focus() with no
  // intermediate await.
  event.waitUntil(
    self.clients.openWindow ? self.clients.openWindow(target) : self.clients.matchAll().then((list) => list[0]?.focus()),
  )
})
