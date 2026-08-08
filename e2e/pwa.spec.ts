import { test, expect } from '@playwright/test'

// Pure HTTP — no browser binary needed. These two routes must stay reachable
// without auth (proxy.ts carves them out of the middleware matcher) since the
// browser's installability check and the service worker's offline fallback
// both fetch them directly, independent of whether the visitor is logged in.

test.describe('Web app manifest', () => {
  test('GET /manifest.webmanifest returns 200, unauthenticated', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest', { maxRedirects: 0 })
    expect(response.status()).toBe(200)
  })

  test('manifest includes installability-required fields and icons', async ({ request }) => {
    const manifest = await (await request.get('/manifest.webmanifest')).json()
    expect(manifest.name).toBe('Sherpa Sips')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: '/icons/icon-192.png', sizes: '192x192' }),
        expect.objectContaining({ src: '/icons/icon-512.png', sizes: '512x512' }),
        expect.objectContaining({ purpose: 'maskable' }),
      ]),
    )
  })
})

test.describe('Offline fallback page', () => {
  test('GET /offline returns 200, unauthenticated', async ({ request }) => {
    const response = await request.get('/offline', { maxRedirects: 0 })
    expect(response.status()).toBe(200)
  })

  test('response contains offline messaging', async ({ request }) => {
    const html = await (await request.get('/offline')).text()
    expect(html).toContain("You&#x27;re offline")
  })
})

test.describe('Service worker script', () => {
  test('GET /sw.js returns 200 with a JS content type', async ({ request }) => {
    const response = await request.get('/sw.js')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('javascript')
  })
})
