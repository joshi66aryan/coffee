import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render } from '@testing-library/react'
import { RealtimeRefresh } from '@/components/ui/realtime-refresh'

// Changes are coalesced before the refresh lands, so tests step past that
// window rather than asserting synchronously.
const COALESCE_MS = 250

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden })
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const { mockChannel, mockRemoveChannel, mockOn, statusCallbacks, capturedCallbacks } = vi.hoisted(() => {
  const capturedCallbacks: (() => void)[] = []
  // Supabase hands `subscribe` a callback it invokes with the channel's
  // connection status — the component gates its fallback polling on that.
  const statusCallbacks: ((status: string) => void)[] = []
  const mockSubscribe = vi.fn((callback?: (status: string) => void) => {
    if (callback) statusCallbacks.push(callback)
    return channelBuilder
  })
  const mockOn = vi.fn((_type: string, _filter: unknown, callback: () => void) => {
    capturedCallbacks.push(callback)
    return channelBuilder
  })
  const channelBuilder = { on: mockOn, subscribe: mockSubscribe }
  const mockChannel = vi.fn(() => channelBuilder)
  const mockRemoveChannel = vi.fn()
  return { mockChannel, mockRemoveChannel, mockOn, statusCallbacks, capturedCallbacks }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ channel: mockChannel, removeChannel: mockRemoveChannel }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  capturedCallbacks.length = 0
  statusCallbacks.length = 0
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
})

afterEach(() => {
  vi.useRealTimers()
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
    vi.advanceTimersByTime(COALESCE_MS)

    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('collapses a burst of changes into a single refresh', () => {
    render(<RealtimeRefresh table="orders" />)

    const [onChange] = capturedCallbacks
    onChange()
    onChange()
    onChange()
    vi.advanceTimersByTime(COALESCE_MS)

    // Each refresh re-runs every query on the page — five rows changing in one
    // admin action should cost one render, not five.
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('holds a refresh while the tab is hidden and applies it when it is shown again', () => {
    render(<RealtimeRefresh table="orders" />)
    setHidden(true)

    capturedCallbacks.forEach(cb => cb())
    vi.advanceTimersByTime(COALESCE_MS)

    expect(mockRefresh).not.toHaveBeenCalled()

    setHidden(false)

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
    it('refreshes on a timer as a safety net while the channel has not connected', () => {
      render(<RealtimeRefresh table="orders" />)

      vi.advanceTimersByTime(20_000 + COALESCE_MS)

      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })

    it('stops polling once unmounted', () => {
      const { unmount } = render(<RealtimeRefresh table="orders" />)
      unmount()

      vi.advanceTimersByTime(60_000)

      expect(mockRefresh).not.toHaveBeenCalled()
    })

    it('stops polling once the channel reports SUBSCRIBED', () => {
      render(<RealtimeRefresh table="orders" />)

      statusCallbacks.forEach(cb => cb('SUBSCRIBED'))
      vi.advanceTimersByTime(120_000)

      // Realtime is healthy, so every change arrives as an event — polling on
      // top of that would re-run the whole server render every 20s.
      expect(mockRefresh).not.toHaveBeenCalled()
    })

    it('resumes polling if the channel later errors', () => {
      render(<RealtimeRefresh table="orders" />)

      statusCallbacks.forEach(cb => cb('SUBSCRIBED'))
      vi.advanceTimersByTime(60_000)
      expect(mockRefresh).not.toHaveBeenCalled()

      statusCallbacks.forEach(cb => cb('CHANNEL_ERROR'))
      vi.advanceTimersByTime(20_000 + COALESCE_MS)

      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })

    it('still delivers realtime events while subscribed', () => {
      render(<RealtimeRefresh table="orders" />)

      statusCallbacks.forEach(cb => cb('SUBSCRIBED'))
      capturedCallbacks.forEach(cb => cb())
      vi.advanceTimersByTime(COALESCE_MS)

      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })
  })
})
