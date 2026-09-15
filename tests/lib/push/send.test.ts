import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { sendNotification, setVapidDetails, WebPushErrorMock, mockFrom } = vi.hoisted(() => {
  class WebPushErrorMock extends Error {
    statusCode: number
    constructor(message: string, statusCode: number) {
      super(message)
      this.statusCode = statusCode
    }
  }
  return {
    sendNotification: vi.fn(),
    setVapidDetails: vi.fn(),
    WebPushErrorMock,
    mockFrom: vi.fn(),
  }
})

vi.mock('web-push', () => ({
  default: { setVapidDetails, sendNotification },
  WebPushError: WebPushErrorMock,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}))

vi.mock('@/lib/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { headerStore } = vi.hoisted(() => ({ headerStore: new Map<string, string>() }))

vi.mock('next/headers', () => ({
  headers: async () => ({
    get: (name: string) => headerStore.get(name.toLowerCase()) ?? null,
  }),
}))

import { sendPushToAdmins, sendPushToCafe, pushUrl } from '@/lib/push/send'

function selectBuilder(result: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    returns: vi.fn(() => builder),
    then: (resolve: (value: unknown) => void) => resolve(result),
  }
  return builder
}

function deleteBuilder() {
  const builder = {
    delete: vi.fn(() => builder),
    eq: vi.fn(() => Promise.resolve({ error: null })),
  }
  return builder
}

const subscription = { id: 'sub-1', endpoint: 'https://push.example/1', p256dh: 'p1', auth_key: 'a1' }

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('VAPID_SUBJECT', 'mailto:ops@example.com')
  vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'public-key')
  vi.stubEnv('VAPID_PRIVATE_KEY', 'private-key')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('sendPushToAdmins', () => {
  it('sends the payload to every admin subscription', async () => {
    mockFrom.mockReturnValueOnce(selectBuilder({ data: [subscription], error: null }))
    sendNotification.mockResolvedValue({ statusCode: 201, body: '', headers: {} })

    await sendPushToAdmins({ title: 'New order received', body: 'Body', url: '/admin/orders/1' })

    expect(sendNotification).toHaveBeenCalledWith(
      { endpoint: subscription.endpoint, keys: { p256dh: 'p1', auth: 'a1' } },
      JSON.stringify({ title: 'New order received', body: 'Body', url: '/admin/orders/1' }),
      expect.objectContaining({ timeout: expect.any(Number) }),
    )
  })

  it('does nothing when there are no admin subscriptions', async () => {
    mockFrom.mockReturnValueOnce(selectBuilder({ data: [], error: null }))

    await sendPushToAdmins({ title: 't', body: 'b' })

    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('does nothing when loading subscriptions fails', async () => {
    mockFrom.mockReturnValueOnce(selectBuilder({ data: null, error: { message: 'db down' } }))

    await sendPushToAdmins({ title: 't', body: 'b' })

    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('deletes the subscription row when the push service reports it is gone (410)', async () => {
    mockFrom.mockReturnValueOnce(selectBuilder({ data: [subscription], error: null }))
    sendNotification.mockRejectedValue(new WebPushErrorMock('gone', 410))
    const del = deleteBuilder()
    mockFrom.mockReturnValueOnce(del)

    await sendPushToAdmins({ title: 't', body: 'b' })

    expect(del.delete).toHaveBeenCalled()
    expect(del.eq).toHaveBeenCalledWith('id', subscription.id)
  })

  it('leaves the subscription row alone on a non-expiry error', async () => {
    mockFrom.mockReturnValueOnce(selectBuilder({ data: [subscription], error: null }))
    sendNotification.mockRejectedValue(new Error('network down'))

    await sendPushToAdmins({ title: 't', body: 'b' })

    // Only the initial select call — no follow-up delete call.
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })
})

describe('VAPID configuration', () => {
  // Each case needs a fresh module: the configured flag is memoised.
  async function freshModule() {
    vi.resetModules()
    return import('@/lib/push/send')
  }

  it('does not read VAPID config at import time', async () => {
    vi.stubEnv('VAPID_SUBJECT', '')
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', '')
    vi.stubEnv('VAPID_PRIVATE_KEY', '')

    await expect(freshModule()).resolves.toBeDefined()
    expect(setVapidDetails).not.toHaveBeenCalled()
  })

  it('skips sending when the VAPID vars are missing', async () => {
    vi.stubEnv('VAPID_SUBJECT', '')
    const { sendPushToAdmins } = await freshModule()
    mockFrom.mockReturnValueOnce(selectBuilder({ data: [subscription], error: null }))

    await sendPushToAdmins({ title: 't', body: 'b' })

    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('configures web-push once across multiple sends', async () => {
    const { sendPushToAdmins } = await freshModule()
    sendNotification.mockResolvedValue({ statusCode: 201, body: '', headers: {} })
    mockFrom.mockReturnValueOnce(selectBuilder({ data: [subscription], error: null }))
    mockFrom.mockReturnValueOnce(selectBuilder({ data: [subscription], error: null }))

    await sendPushToAdmins({ title: 't', body: 'b' })
    await sendPushToAdmins({ title: 't', body: 'b' })

    expect(setVapidDetails).toHaveBeenCalledOnce()
    expect(setVapidDetails).toHaveBeenCalledWith('mailto:ops@example.com', 'public-key', 'private-key')
    expect(sendNotification).toHaveBeenCalledTimes(2)
  })

  it('skips sending when web-push rejects the config', async () => {
    setVapidDetails.mockImplementationOnce(() => {
      throw new Error('Vapid subject is not a url or mailto url')
    })
    const { sendPushToAdmins } = await freshModule()
    mockFrom.mockReturnValueOnce(selectBuilder({ data: [subscription], error: null }))

    await sendPushToAdmins({ title: 't', body: 'b' })

    expect(sendNotification).not.toHaveBeenCalled()
  })
})

describe('sendPushToCafe', () => {
  it('scopes the subscription lookup to the given café', async () => {
    const builder = selectBuilder({ data: [subscription], error: null })
    mockFrom.mockReturnValueOnce(builder)
    sendNotification.mockResolvedValue({ statusCode: 201, body: '', headers: {} })

    await sendPushToCafe('cafe-1', { title: 'Order status updated', body: 'Body', url: '/orders/1' })

    expect(builder.eq).toHaveBeenCalledWith('user_id', 'cafe-1')
    expect(builder.eq).toHaveBeenCalledWith('role', 'cafe')
    expect(sendNotification).toHaveBeenCalledOnce()
  })
})

// The service worker resolves a *relative* url against its own origin, so a
// relative link let whichever browser displayed the notification decide where
// it landed. With one Supabase project behind both local dev and production,
// that opened a real production order on http://localhost:3000 for anyone who
// had ever enabled notifications while developing.
describe('pushUrl', () => {
  const ORIGINAL_SITE_URL = process.env.SITE_URL

  beforeEach(() => {
    headerStore.clear()
    delete process.env.SITE_URL
  })

  afterEach(() => {
    if (ORIGINAL_SITE_URL === undefined) delete process.env.SITE_URL
    else process.env.SITE_URL = ORIGINAL_SITE_URL
  })

  it('points the notification at the deployment that raised it', async () => {
    process.env.SITE_URL = 'https://www.orderfromsherpasips.com'
    expect(await pushUrl('/admin/orders/order-1')).toBe(
      'https://www.orderfromsherpasips.com/admin/orders/order-1',
    )
  })

  it('falls back to the requesting host when no origin is configured', async () => {
    headerStore.set('host', 'localhost:3000')
    expect(await pushUrl('/orders/order-1')).toBe('http://localhost:3000/orders/order-1')
  })

  it('leaves no double slash where the configured origin has a trailing one', async () => {
    process.env.SITE_URL = 'https://www.orderfromsherpasips.com/'
    expect(await pushUrl('/admin')).toBe('https://www.orderfromsherpasips.com/admin')
  })
})
