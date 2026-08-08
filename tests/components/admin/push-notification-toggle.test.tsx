import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PushNotificationToggle } from '@/components/admin/push-notification-toggle'
import { NotificationPromptBanner } from '@/components/admin/notification-prompt-banner'

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

function setPermission(value: NotificationPermission) {
  Object.defineProperty(window, 'Notification', {
    value: { permission: value, requestPermission: vi.fn() },
    configurable: true,
    writable: true,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mockIsPushSupported.mockReturnValue(true)
  mockHasBrowserPushSubscription.mockResolvedValue(false)
  setPermission('default')
})

describe('PushNotificationToggle (admin)', () => {
  it('reflects the disabled state', () => {
    render(<PushNotificationToggle initialSubscribed={false} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('subscribes and flips to enabled on success', async () => {
    mockSubscribeBrowser.mockResolvedValue({ toJSON: () => ({ endpoint: 'https://push.example/admin-1' }) })
    mockSubscribeToPush.mockResolvedValue({})

    render(<PushNotificationToggle initialSubscribed={false} />)
    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(mockSubscribeToPush).toHaveBeenCalledWith({ endpoint: 'https://push.example/admin-1' })
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
    })
  })

  it('shows an error message when subscribing fails', async () => {
    mockSubscribeBrowser.mockRejectedValue(new Error('Notification permission denied'))

    render(<PushNotificationToggle initialSubscribed={false} />)
    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Notification permission denied')).toBeInTheDocument()
    })
  })

  it('renders nothing when push is unsupported', () => {
    mockIsPushSupported.mockReturnValue(false)
    const { container } = render(<PushNotificationToggle initialSubscribed={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('stays in sync with another toggle mounted on the same page (header bell + dashboard banner)', async () => {
    mockSubscribeBrowser.mockResolvedValue({ toJSON: () => ({ endpoint: 'https://push.example/admin-1' }) })
    mockSubscribeToPush.mockResolvedValue({})

    render(
      <>
        <PushNotificationToggle initialSubscribed={false} />
        <NotificationPromptBanner initialSubscribed={false} />
      </>,
    )

    // Captured before clicking — its accessible name (from `title`) changes
    // once subscribed, so the element reference is what we assert on.
    const bellButton = screen.getByRole('button', { name: /enable new order notifications/i })

    await waitFor(() => expect(screen.getByText('Enable')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Enable'))

    await waitFor(() => {
      // The banner's own subscribe flips the header bell too, without the
      // bell needing its own click.
      expect(bellButton).toHaveAttribute('aria-pressed', 'true')
      expect(screen.queryByText('Get notified about new orders')).not.toBeInTheDocument()
    })
  })
})
