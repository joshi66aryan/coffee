import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PushNotificationToggle } from '@/components/cafe/push-notification-toggle'

const mockIsPushSupported = vi.fn()
const mockSubscribeBrowser = vi.fn()
const mockUnsubscribeBrowser = vi.fn()
const mockHasBrowserPushSubscription = vi.fn()
vi.mock('@/lib/push/client', () => ({
  isPushSupported: () => mockIsPushSupported(),
  subscribeBrowserToPush: () => mockSubscribeBrowser(),
  unsubscribeBrowserFromPush: () => mockUnsubscribeBrowser(),
  hasBrowserPushSubscription: () => mockHasBrowserPushSubscription(),
}))

const mockSubscribeToPush = vi.fn()
const mockUnsubscribeFromPush = vi.fn()
vi.mock('@/lib/push/actions', () => ({
  subscribeToPush: (...args: unknown[]) => mockSubscribeToPush(...args),
  unsubscribeFromPush: (...args: unknown[]) => mockUnsubscribeFromPush(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockIsPushSupported.mockReturnValue(true)
  // Matches initialSubscribed by default — tests that need the mount-time
  // reconciliation to disagree with the server value set this explicitly.
  mockHasBrowserPushSubscription.mockResolvedValue(false)
})

describe('PushNotificationToggle (café)', () => {
  it('reflects the disabled state', () => {
    render(<PushNotificationToggle initialSubscribed={false} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  it('reflects the enabled state', async () => {
    mockHasBrowserPushSubscription.mockResolvedValue(true)
    render(<PushNotificationToggle initialSubscribed={true} />)
    await waitFor(() => {
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    })
  })

  it('falls back to disabled if the browser has no active subscription, even if the server thinks it does', async () => {
    mockHasBrowserPushSubscription.mockResolvedValue(false)
    render(<PushNotificationToggle initialSubscribed={true} />)
    await waitFor(() => {
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    })
  })

  it('subscribes and flips to enabled on success', async () => {
    mockSubscribeBrowser.mockResolvedValue({ toJSON: () => ({ endpoint: 'https://push.example/1' }) })
    mockSubscribeToPush.mockResolvedValue({})

    render(<PushNotificationToggle initialSubscribed={false} />)
    await userEvent.click(screen.getByRole('switch'))

    await waitFor(() => {
      expect(mockSubscribeToPush).toHaveBeenCalledWith({ endpoint: 'https://push.example/1' })
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    })
  })

  it('unsubscribes and flips to disabled on success', async () => {
    mockHasBrowserPushSubscription.mockResolvedValue(true)
    mockUnsubscribeBrowser.mockResolvedValue('https://push.example/1')
    mockUnsubscribeFromPush.mockResolvedValue({})

    render(<PushNotificationToggle initialSubscribed={true} />)
    await waitFor(() => expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true'))
    await userEvent.click(screen.getByRole('switch'))

    await waitFor(() => {
      expect(mockUnsubscribeFromPush).toHaveBeenCalledWith('https://push.example/1')
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    })
  })

  it('shows an error and stays disabled when the browser denies permission', async () => {
    mockSubscribeBrowser.mockRejectedValue(new Error('Notification permission denied'))

    render(<PushNotificationToggle initialSubscribed={false} />)
    await userEvent.click(screen.getByRole('switch'))

    await waitFor(() => {
      expect(screen.getByText('Notification permission denied')).toBeInTheDocument()
    })
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  it('disables the toggle when push is unsupported', () => {
    mockIsPushSupported.mockReturnValue(false)
    render(<PushNotificationToggle initialSubscribed={false} />)
    expect(screen.getByRole('switch')).toBeDisabled()
    expect(screen.getByText(/not supported in this browser/i)).toBeInTheDocument()
  })
})
