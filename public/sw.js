// Service worker: Web Push notifications (below) plus a minimal offline
// cache — an app-shell precache and runtime caching for static assets, with
// a dedicated offline fallback page for navigations when the network is
// unreachable. There's no build-time precache manifest (no Workbox/next-pwa
// — see CLAUDE.md), so this only caches what it's told to and what gets
// requested during normal use; it's not a full precache of every route.
// Bump this whenever a precached asset's *content* changes (most often the
// offline page) — activate only evicts caches whose name differs, so without
// a bump every already-installed client keeps serving the stale precache.
const CACHE_VERSION = 'sherpa-sips-v6'
const OFFLINE_URL = '/offline'
const PRECACHE_URLS = [OFFLINE_URL, '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

// Runtime assets live in their own cache, separate from the precache above.
// They're content-hashed (/_next/static/) or stable (/icons/), so entries are
// never *replaced* — each deploy introduces a new set of filenames and the
// previous deploy's chunks would otherwise sit in storage forever, since
// `activate` only clears caches whose *name* changed. Capping the entry count
// and evicting oldest-first keeps that bounded; the Cache API preserves
// insertion order, so keys()[0] is the least recently added.
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`
const RUNTIME_CACHE_MAX_ENTRIES = 120

async function putWithLimit(request, response) {
  const cache = await caches.open(RUNTIME_CACHE)
  await cache.put(request, response)

  const keys = await cache.keys()
  for (let i = 0; i < keys.length - RUNTIME_CACHE_MAX_ENTRIES; i++) {
    await cache.delete(keys[i])
  }
}

// Turbopack's dev server reuses /_next/static/ paths across edits (no
// content hash per build like production), so cache-first there would keep
// serving a chunk from before your last edit instead of picking up Fast
// Refresh output — causing hydration mismatches against the (always live) SSR.
const IS_LOCAL_DEV = ['localhost', '127.0.0.1'].includes(self.location.hostname)

// Take over immediately on update instead of waiting for every open tab to
// close first — this file changes during active development, and a stale
// cached worker would keep serving old push/click behavior otherwise.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {}),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  const keep = [CACHE_VERSION, RUNTIME_CACHE]
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => !keep.includes(name)).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  // Page navigations: content (orders, stock, pricing) changes constantly,
  // so always prefer the network — only fall back to the offline page when
  // there's truly no connection.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL).then((cached) => cached || Response.error())))
    return
  }

  // Hashed build assets and app icons don't change under a given deploy —
  // cache-first keeps repeat visits fast and available offline. Skipped for
  // /_next/static/ in local dev — see IS_LOCAL_DEV above.
  const path = new URL(request.url).pathname
  if (path.startsWith('/_next/static/') && IS_LOCAL_DEV) return
  if (path.startsWith('/_next/static/') || path.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            event.waitUntil(putWithLimit(request, copy))
          }
          return response
        })
      }),
    )
  }
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
