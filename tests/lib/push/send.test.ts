import { describe, it, expect, vi, beforeEach } from 'vitest'

const { sendNotification, WebPushErrorMock, mockFrom } = vi.hoisted(() => {
  class WebPushErrorMock extends Error {
    statusCode: number
    constructor(message: string, statusCode: number) {
      super(message)
      this.statusCode = statusCode
    }
  }
  return { sendNotification: vi.fn(), WebPushErrorMock, mockFrom: vi.fn() }
})

vi.mock('web-push', () => ({
  default: { setVapidDetails: vi.fn(), sendNotification },
  WebPushError: WebPushErrorMock,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}))

vi.mock('@/lib/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { sendPushToAdmins, sendPushToCafe } from '@/lib/push/send'

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
