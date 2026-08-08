import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { RealtimeRefresh } from '@/components/ui/realtime-refresh'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const { mockChannel, mockRemoveChannel, mockOn, mockSubscribe, capturedCallbacks } = vi.hoisted(() => {
  const capturedCallbacks: (() => void)[] = []
  const mockSubscribe = vi.fn()
  const mockOn = vi.fn((_type: string, _filter: unknown, callback: () => void) => {
    capturedCallbacks.push(callback)
    return channelBuilder
  })
  const channelBuilder = { on: mockOn, subscribe: mockSubscribe }
  mockSubscribe.mockReturnValue(channelBuilder)
  const mockChannel = vi.fn(() => channelBuilder)
  const mockRemoveChannel = vi.fn()
  return { mockChannel, mockRemoveChannel, mockOn, mockSubscribe, capturedCallbacks }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ channel: mockChannel, removeChannel: mockRemoveChannel }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  capturedCallbacks.length = 0
})

describe('RealtimeRefresh', () => {
  it('subscribes to postgres_changes for the given table without refreshing on mount', () => {
    render(<RealtimeRefresh table="orders" />)

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: '*', schema: 'public', table: 'orders' }),
      expect.any(Function),
    )
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('refreshes the router when the channel reports a change', () => {
    render(<RealtimeRefresh table="orders" />)

    capturedCallbacks.forEach(cb => cb())

    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('subscribes to multiple tables when given an array', () => {
    render(<RealtimeRefresh table={['orders', 'cafes']} />)

    expect(mockOn).toHaveBeenCalledTimes(2)
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ table: 'orders' }),
      expect.any(Function),
    )
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ table: 'cafes' }),
      expect.any(Function),
    )
  })

  it('passes the filter through to the subscription', () => {
    render(<RealtimeRefresh table="orders" filter="cafe_id=eq.cafe-1" />)

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ filter: 'cafe_id=eq.cafe-1' }),
      expect.any(Function),
    )
  })

  it('removes the channel on unmount', () => {
    const { unmount } = render(<RealtimeRefresh table="orders" />)
    unmount()
    expect(mockRemoveChannel).toHaveBeenCalledOnce()
  })

  describe('fallback polling', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('refreshes on a timer as a safety net even with no realtime events', () => {
      render(<RealtimeRefresh table="orders" />)

      vi.advanceTimersByTime(20_000)

      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })

    it('stops polling once unmounted', () => {
      const { unmount } = render(<RealtimeRefresh table="orders" />)
      unmount()

      vi.advanceTimersByTime(60_000)

      expect(mockRefresh).not.toHaveBeenCalled()
    })
  })
})
