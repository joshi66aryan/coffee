import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotificationPromptBanner } from '@/components/cafe/notification-prompt-banner'

const mockIsPushSupported = vi.fn()
const mockSubscribeBrowser = vi.fn()
const mockHasBrowserPushSubscription = vi.fn()
vi.mock('@/lib/push/client', () => ({
  isPushSupported: () => mockIsPushSupported(),
  subscribeBrowserToPush: () => mockSubscribeBrowser(),
  unsubscribeBrowserFromPush: vi.fn(),
  hasBrowserPushSubscription: () => mockHasBrowserPushSubscription(),
}))

const mockSubscribeToPush = vi.fn()
vi.mock('@/lib/push/actions', () => ({
  subscribeToPush: (...args: unknown[]) => mockSubscribeToPush(...args),
  unsubscribeFromPush: vi.fn(),
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

describe('NotificationPromptBanner (café)', () => {
  it('shows the banner when permission has not been decided yet', async () => {
    render(<NotificationPromptBanner initialSubscribed={false} />)
    await waitFor(() => {
      expect(screen.getByText('Get notified about your orders')).toBeInTheDocument()
    })
  })

  it('does not show when already subscribed', async () => {
    mockHasBrowserPushSubscription.mockResolvedValue(true)
    render(<NotificationPromptBanner initialSubscribed={true} />)
    await waitFor(() => {
      expect(screen.queryByText('Get notified about your orders')).not.toBeInTheDocument()
    })
  })

  it('does not show when permission was already denied', async () => {
    setPermission('denied')
    render(<NotificationPromptBanner initialSubscribed={false} />)
    await waitFor(() => {
      expect(screen.queryByText('Get notified about your orders')).not.toBeInTheDocument()
    })
  })

  it('does not show once dismissed, including after remount', async () => {
    render(<NotificationPromptBanner initialSubscribed={false} />)
    await waitFor(() => expect(screen.getByLabelText('Dismiss')).toBeInTheDocument())

    await userEvent.click(screen.getByLabelText('Dismiss'))
    expect(screen.queryByText('Get notified about your orders')).not.toBeInTheDocument()

    render(<NotificationPromptBanner initialSubscribed={false} />)
    await waitFor(() => {
      expect(screen.queryByText('Get notified about your orders')).not.toBeInTheDocument()
    })
  })

  it('subscribes and hides itself when Enable succeeds', async () => {
    mockSubscribeBrowser.mockResolvedValue({ toJSON: () => ({ endpoint: 'https://push.example/1' }) })
    mockSubscribeToPush.mockResolvedValue({})

    render(<NotificationPromptBanner initialSubscribed={false} />)
    await waitFor(() => expect(screen.getByText('Enable')).toBeInTheDocument())

    await userEvent.click(screen.getByText('Enable'))

    await waitFor(() => {
      expect(mockSubscribeToPush).toHaveBeenCalledWith({ endpoint: 'https://push.example/1' })
      expect(screen.queryByText('Get notified about your orders')).not.toBeInTheDocument()
    })
  })

  it('renders nothing when push is unsupported', async () => {
    mockIsPushSupported.mockReturnValue(false)
    const { container } = render(<NotificationPromptBanner initialSubscribed={false} />)
    await waitFor(() => {
      expect(container).toBeEmptyDOMElement()
    })
  })
})
