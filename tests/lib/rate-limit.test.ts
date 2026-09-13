import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRpc = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ rpc: (fn: string, args: unknown) => mockRpc(fn, args) }),
}))

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
vi.mock('@/lib/logger', () => ({ default: mockLogger }))

const mockHeaders = vi.fn()
vi.mock('next/headers', () => ({ headers: () => mockHeaders() }))

const {
  consumeRateLimit,
  getClientIp,
  hashIdentifier,
  retryAfterMessage,
  RATE_LIMITS,
} = await import('@/lib/rate-limit')

function headerMap(entries: Record<string, string>) {
  return { get: (name: string) => entries[name] ?? null }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRpc.mockResolvedValue({ data: { allowed: true, retry_after: 0 }, error: null })
  mockHeaders.mockResolvedValue(headerMap({}))
})

describe('consumeRateLimit — what reaches the counter', () => {
  it('namespaces the key by bucket so two limits never share a counter', async () => {
    await consumeRateLimit('signIn', 'abc')
    await consumeRateLimit('passwordReset', 'abc')

    expect(mockRpc.mock.calls[0][1]).toMatchObject({ p_key: 'signIn:abc' })
    expect(mockRpc.mock.calls[1][1]).toMatchObject({ p_key: 'passwordReset:abc' })
  })

  it('passes the configured limit and window for the bucket, not the caller’s', async () => {
    await consumeRateLimit('signUp', 'ip:1.2.3.4')

    expect(mockRpc).toHaveBeenCalledWith('consume_rate_limit', {
      p_key: 'signUp:ip:1.2.3.4',
      p_limit: RATE_LIMITS.signUp.limit,
      p_window_seconds: RATE_LIMITS.signUp.windowSeconds,
    })
  })

  it('reports the refusal and the wait when the window is full', async () => {
    mockRpc.mockResolvedValue({ data: { allowed: false, retry_after: 240 }, error: null })

    await expect(consumeRateLimit('signIn', 'abc')).resolves.toEqual({
      allowed: false,
      retryAfter: 240,
    })
  })

  it('logs a refusal, since that line is what shows an attack in progress', async () => {
    mockRpc.mockResolvedValue({ data: { allowed: false, retry_after: 60 }, error: null })

    await consumeRateLimit('signIn', 'abc')

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Rate limit exceeded',
      expect.objectContaining({ bucket: 'signIn' }),
    )
  })
})

describe('consumeRateLimit — failure behaviour', () => {
  // Deliberate: a limiter that fails closed turns any database hiccup into a
  // total sign-in outage, and makes itself the most attractive thing on the
  // system to break. It sits in front of Supabase's own auth limits.
  it('allows the request when the counter errors, and says so loudly', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'relation does not exist' } })

    await expect(consumeRateLimit('signIn', 'abc')).resolves.toEqual({
      allowed: true,
      retryAfter: 0,
    })
    expect(mockLogger.error).toHaveBeenCalled()
  })

  it('allows the request when the counter throws', async () => {
    mockRpc.mockRejectedValue(new Error('connection refused'))

    await expect(consumeRateLimit('signIn', 'abc')).resolves.toEqual({
      allowed: true,
      retryAfter: 0,
    })
    expect(mockLogger.error).toHaveBeenCalled()
  })

  it('allows the request when the counter returns nothing', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    await expect(consumeRateLimit('signIn', 'abc')).resolves.toEqual({
      allowed: true,
      retryAfter: 0,
    })
  })
})

describe('hashIdentifier', () => {
  // Sign-in is metered per address, but a table of addresses that have been
  // tried is exactly the credential-stuffing worksheet the sign-in action
  // refuses to write to the log.
  it('does not carry the address it is derived from', () => {
    const hash = hashIdentifier('manager@basecamp.com.np')

    expect(hash).not.toContain('manager')
    expect(hash).not.toContain('basecamp')
    expect(hash).toMatch(/^[0-9a-f]{32}$/)
  })

  it('is stable, so the same account keeps the same counter', () => {
    expect(hashIdentifier('a@b.com')).toBe(hashIdentifier('a@b.com'))
  })

  it('treats case and surrounding space as the same account', () => {
    expect(hashIdentifier('  Manager@Cafe.COM ')).toBe(hashIdentifier('manager@cafe.com'))
  })

  it('separates different accounts', () => {
    expect(hashIdentifier('a@b.com')).not.toBe(hashIdentifier('c@d.com'))
  })
})

describe('getClientIp', () => {
  it('takes the original client from x-forwarded-for, not the nearest proxy', async () => {
    mockHeaders.mockResolvedValue(headerMap({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18, 150.172.238.178' }))

    await expect(getClientIp()).resolves.toBe('203.0.113.7')
  })

  it('falls back to x-real-ip', async () => {
    mockHeaders.mockResolvedValue(headerMap({ 'x-real-ip': '198.51.100.4' }))

    await expect(getClientIp()).resolves.toBe('198.51.100.4')
  })

  it('returns a placeholder rather than throwing when no proxy header is present', async () => {
    await expect(getClientIp()).resolves.toBe('unknown')
  })

  it('does not treat an empty forwarded-for as an address', async () => {
    mockHeaders.mockResolvedValue(headerMap({ 'x-forwarded-for': '  ' }))

    await expect(getClientIp()).resolves.toBe('unknown')
  })
})

describe('retryAfterMessage', () => {
  it('says "a minute" for anything inside one', () => {
    expect(retryAfterMessage(1)).toBe('Please try again in a minute.')
    expect(retryAfterMessage(60)).toBe('Please try again in a minute.')
  })

  it('rounds up, so the advice is never early', () => {
    expect(retryAfterMessage(61)).toBe('Please try again in 2 minutes.')
    expect(retryAfterMessage(290)).toBe('Please try again in 5 minutes.')
  })
})
