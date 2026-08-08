import { describe, it, expect, afterEach, vi } from 'vitest'
import { urlBase64ToUint8Array, isPushSupported, hasBrowserPushSubscription } from '@/lib/push/client'

describe('urlBase64ToUint8Array', () => {
  it('decodes a standard base64 string to matching bytes', () => {
    // "AQID" is base64 for bytes [1, 2, 3]
    expect(Array.from(urlBase64ToUint8Array('AQID'))).toEqual([1, 2, 3])
  })

  it('handles URL-safe characters (- and _) not present in standard base64', () => {
    // Standard base64 "+/8=" re-encoded URL-safe is "-_8"
    const standard = urlBase64ToUint8Array('+/8=')
    const urlSafe = urlBase64ToUint8Array('-_8')
    expect(Array.from(urlSafe)).toEqual(Array.from(standard))
  })

  it('pads inputs whose length is not a multiple of 4', () => {
    // "AQ" (2 chars) needs two '=' of padding to decode to byte [1]
    expect(Array.from(urlBase64ToUint8Array('AQ'))).toEqual([1])
  })
})

describe('isPushSupported', () => {
  afterEach(() => {
    // @ts-expect-error — test-only cleanup of properties this suite may have added
    delete window.PushManager
    // @ts-expect-error — test-only cleanup of properties this suite may have added
    delete window.Notification
    // @ts-expect-error — jsdom's navigator is configurable in this test env
    delete navigator.serviceWorker
  })

  it('returns false when any of serviceWorker, PushManager, or Notification is missing (e.g. jsdom by default)', () => {
    expect(isPushSupported()).toBe(false)
  })

  it('returns true once serviceWorker, PushManager, and Notification are all present', () => {
    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true })
    // @ts-expect-error — stubbing browser APIs jsdom doesn't implement
    window.PushManager = function () {}
    // @ts-expect-error — stubbing browser APIs jsdom doesn't implement
    window.Notification = function () {}

    expect(isPushSupported()).toBe(true)
  })
})

describe('hasBrowserPushSubscription', () => {
  afterEach(() => {
    // @ts-expect-error — jsdom's navigator is configurable in this test env
    delete navigator.serviceWorker
  })

  it('returns false when the browser has no service worker support', async () => {
    expect(await hasBrowserPushSubscription()).toBe(false)
  })

  it('returns false when there is no registration for /sw.js', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { getRegistration: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
    expect(await hasBrowserPushSubscription()).toBe(false)
  })

  it('returns false when registered but not subscribed', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistration: vi.fn().mockResolvedValue({
          pushManager: { getSubscription: vi.fn().mockResolvedValue(null) },
        }),
      },
      configurable: true,
    })
    expect(await hasBrowserPushSubscription()).toBe(false)
  })

  it('returns true when an active subscription exists', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistration: vi.fn().mockResolvedValue({
          pushManager: { getSubscription: vi.fn().mockResolvedValue({ endpoint: 'https://push.example/1' }) },
        }),
      },
      configurable: true,
    })
    expect(await hasBrowserPushSubscription()).toBe(true)
  })
})
