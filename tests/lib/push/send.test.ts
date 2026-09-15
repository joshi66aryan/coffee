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

import {
  sendPushToAdmins,
  sendPushToCafe,
  isLocalOrigin,
  belongsToDeployment,
} from '@/lib/push/send'

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

const PROD = 'https://www.example.com'
const LOCAL = 'http://localhost:3000'

const subscription = {
  id: 'sub-1',
  endpoint: 'https://push.example/1',
  p256dh: 'p1',
  auth_key: 'a1',
  origin: PROD,
}

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

    await sendPushToAdmins({ title: 'New order received', body: 'Body', path: '/admin/orders/1' }, PROD)

    expect(sendNotification).toHaveBeenCalledWith(
      { endpoint: subscription.endpoint, keys: { p256dh: 'p1', auth: 'a1' } },
      JSON.stringify({
        title: 'New order received',
        body: 'Body',
        url: 'https://www.example.com/admin/orders/1',
      }),
      expect.objectContaining({ timeout: expect.any(Number) }),
    )
  })

  it('does nothing when there are no admin subscriptions', async () => {
    mockFrom.mockReturnValueOnce(selectBuilder({ data: [], error: null }))

    await sendPushToAdmins({ title: 't', body: 'b' }, PROD)

    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('does nothing when loading subscriptions fails', async () => {
    mockFrom.mockReturnValueOnce(selectBuilder({ data: null, error: { message: 'db down' } }))

    await sendPushToAdmins({ title: 't', body: 'b' }, PROD)

    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('deletes the subscription row when the push service reports it is gone (410)', async () => {
    mockFrom.mockReturnValueOnce(selectBuilder({ data: [subscription], error: null }))
    sendNotification.mockRejectedValue(new WebPushErrorMock('gone', 410))
    const del = deleteBuilder()
    mockFrom.mockReturnValueOnce(del)

    await sendPushToAdmins({ title: 't', body: 'b' }, PROD)

    expect(del.delete).toHaveBeenCalled()
    expect(del.eq).toHaveBeenCalledWith('id', subscription.id)
  })

  it('leaves the subscription row alone on a non-expiry error', async () => {
    mockFrom.mockReturnValueOnce(selectBuilder({ data: [subscription], error: null }))
    sendNotification.mockRejectedValue(new Error('network down'))

    await sendPushToAdmins({ title: 't', body: 'b' }, PROD)

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

    await sendPushToAdmins({ title: 't', body: 'b' }, PROD)

    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('configures web-push once across multiple sends', async () => {
    const { sendPushToAdmins } = await freshModule()
    sendNotification.mockResolvedValue({ statusCode: 201, body: '', headers: {} })
    mockFrom.mockReturnValueOnce(selectBuilder({ data: [subscription], error: null }))
    mockFrom.mockReturnValueOnce(selectBuilder({ data: [subscription], error: null }))

    await sendPushToAdmins({ title: 't', body: 'b' }, PROD)
    await sendPushToAdmins({ title: 't', body: 'b' }, PROD)

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

    await sendPushToAdmins({ title: 't', body: 'b' }, PROD)

    expect(sendNotification).not.toHaveBeenCalled()
  })
})

describe('sendPushToCafe', () => {
  it('scopes the subscription lookup to the given café', async () => {
    const builder = selectBuilder({ data: [subscription], error: null })
    mockFrom.mockReturnValueOnce(builder)
    sendNotification.mockResolvedValue({ statusCode: 201, body: '', headers: {} })

    await sendPushToCafe('cafe-1', { title: 'Order status updated', body: 'Body', path: '/orders/1' }, PROD)

    expect(builder.eq).toHaveBeenCalledWith('user_id', 'cafe-1')
    expect(builder.eq).toHaveBeenCalledWith('role', 'cafe')
    expect(sendNotification).toHaveBeenCalledOnce()
  })
})

// ── Which deployment a notification belongs to ───────────────────────────────
//
// One Supabase project sits behind both local development and production, so
// this table is shared. Every send used to fan out to every row for the role: a
// laptop running `npm run dev` notified real cafés' phones about test orders
// placed in their name, and a real order rang a developer's localhost tab —
// two notifications for one order, which is how it surfaced.

describe('isLocalOrigin', () => {
  it.each([
    ['http://localhost:3000', true],
    ['http://127.0.0.1:3000', true],
    ['http://[::1]:3000', true],
    ['https://www.example.com', false],
    // A deployed host that merely mentions localhost is not this machine.
    ['https://localhost.example.com', false],
    [null, false],
    ['not a url', false],
  ])('%s → %s', (origin, expected) => {
    expect(isLocalOrigin(origin)).toBe(expected)
  })
})

describe('belongsToDeployment', () => {
  it('keeps a dev server to the browsers on its own machine', () => {
    expect(belongsToDeployment(LOCAL, LOCAL)).toBe(true)
    expect(belongsToDeployment(PROD, LOCAL)).toBe(false)
  })

  // Unknown means "created before migration 015". A dev server will not take
  // the chance that it is a café's phone.
  it('treats an unknown origin as somebody else when sending from a dev server', () => {
    expect(belongsToDeployment(null, LOCAL)).toBe(false)
  })

  // The other direction is deliberately not symmetrical: silently dropping a
  // café's notifications, with the toggle still reading ON, is far worse than a
  // developer seeing one extra.
  it('keeps notifying rows of unknown origin from production', () => {
    expect(belongsToDeployment(null, PROD)).toBe(true)
    expect(belongsToDeployment(PROD, PROD)).toBe(true)
  })

  it('never rings a localhost tab from production', () => {
    expect(belongsToDeployment(LOCAL, PROD)).toBe(false)
  })
})

describe('sending across deployments', () => {
  const localSubscription = { ...subscription, id: 'sub-local', origin: LOCAL }

  it('does not notify a café’s real device from a dev server', async () => {
    mockFrom.mockReturnValueOnce(selectBuilder({ data: [subscription], error: null }))

    await sendPushToCafe('cafe-1', { title: 't', body: 'b' }, LOCAL)

    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('does not ring a localhost tab from production', async () => {
    mockFrom.mockReturnValueOnce(selectBuilder({ data: [localSubscription], error: null }))

    await sendPushToAdmins({ title: 't', body: 'b' }, PROD)

    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('notifies only the matching subscription when both exist', async () => {
    mockFrom.mockReturnValueOnce(
      selectBuilder({ data: [subscription, localSubscription], error: null }),
    )
    sendNotification.mockResolvedValue({ statusCode: 201, body: '', headers: {} })

    await sendPushToAdmins({ title: 't', body: 'b', path: '/admin' }, PROD)

    expect(sendNotification).toHaveBeenCalledOnce()
    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: subscription.endpoint }),
      expect.stringContaining('https://www.example.com/admin'),
      expect.anything(),
    )
  })

  it('opens the deployment that sent it, wherever the notification is shown', async () => {
    mockFrom.mockReturnValueOnce(selectBuilder({ data: [localSubscription], error: null }))
    sendNotification.mockResolvedValue({ statusCode: 201, body: '', headers: {} })

    await sendPushToAdmins({ title: 't', body: 'b', path: '/admin/orders/1' }, LOCAL)

    expect(sendNotification).toHaveBeenCalledWith(
      expect.anything(),
      JSON.stringify({ title: 't', body: 'b', url: 'http://localhost:3000/admin/orders/1' }),
      expect.anything(),
    )
  })

  it('falls back to the deployment root when no path is given', async () => {
    mockFrom.mockReturnValueOnce(selectBuilder({ data: [subscription], error: null }))
    sendNotification.mockResolvedValue({ statusCode: 201, body: '', headers: {} })

    await sendPushToAdmins({ title: 't', body: 'b' }, PROD)

    expect(sendNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('"url":"https://www.example.com/"'),
      expect.anything(),
    )
  })
})
