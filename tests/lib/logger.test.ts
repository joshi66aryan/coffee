import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import logger from '@/lib/logger'

let errorSpy: ReturnType<typeof vi.spyOn>
let warnSpy: ReturnType<typeof vi.spyOn>
let infoSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

function lastLine(spy: ReturnType<typeof vi.spyOn>) {
  return JSON.parse(spy.mock.calls.at(-1)![0] as string)
}

describe('logger — the label always survives', () => {
  // The regression this guards: metadata was spread over the label, so
  // `logger.error('Failed to place order', { msg: error.message })` shipped a
  // line whose msg was the raw Supabase string. Every error site in this app
  // passes `msg` that way, so no error log could be found by what it was for.
  it('keeps the label when metadata also carries a msg', () => {
    logger.error('Failed to place order', { msg: 'duplicate key value violates unique constraint' })

    expect(lastLine(errorSpy).msg).toBe('Failed to place order')
  })

  it('keeps the underlying cause too, under its own key', () => {
    logger.error('Failed to place order', { msg: 'connection refused' })

    expect(lastLine(errorSpy).cause).toBe('connection refused')
  })

  it('leaves other metadata untouched alongside it', () => {
    logger.error('Failed to place order', { orderId: 'abc', msg: 'boom', total: 1800 })

    const line = lastLine(errorSpy)
    expect(line).toMatchObject({
      level: 'error',
      msg: 'Failed to place order',
      cause: 'boom',
      orderId: 'abc',
      total: 1800,
    })
  })

  it('omits cause entirely when no metadata msg was given', () => {
    logger.info('Order placed', { orderId: 'abc' })

    expect(lastLine(infoSpy)).not.toHaveProperty('cause')
  })

  it('handles no metadata at all', () => {
    logger.info('Order placed')

    expect(lastLine(infoSpy)).toMatchObject({ level: 'info', msg: 'Order placed' })
  })
})

describe('logger — levels and shape', () => {
  it.each([
    ['error', () => logger.error('x'), () => errorSpy],
    ['warn', () => logger.warn('x'), () => warnSpy],
    ['info', () => logger.info('x'), () => infoSpy],
  ])('routes %s to its own console channel', (level, call, spy) => {
    call()

    expect(lastLine(spy()).level).toBe(level)
  })

  it('emits a single parseable JSON line', () => {
    logger.error('Something failed', { msg: 'cause', userId: 'u1' })

    const raw = errorSpy.mock.calls.at(-1)![0] as string
    expect(raw).not.toContain('\n')
    expect(() => JSON.parse(raw)).not.toThrow()
  })

  it('timestamps every line', () => {
    logger.info('Order placed')

    expect(lastLine(infoSpy).ts).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})
