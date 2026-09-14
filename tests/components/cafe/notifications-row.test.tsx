import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotificationsRow } from '@/components/cafe/notifications-row'

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
  mockHasBrowserPushSubscription.mockResolvedValue(false)
})

describe('NotificationsRow (café Account page)', () => {
  // The point of this row: a café that has never opened App Settings still
  // sees a labelled notification control on the page they actually visit.
  it('is visible and off for a café that has never enabled notifications', () => {
    render(<NotificationsRow initialSubscribed={false} />)
    expect(screen.getByText('Order notifications')).toBeInTheDocument()
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('switch')).toBeEnabled()
  })

  it('subscribes and flips on when switched', async () => {
    mockSubscribeBrowser.mockResolvedValue({ toJSON: () => ({ endpoint: 'https://push.example/1' }) })
    mockSubscribeToPush.mockResolvedValue({})

    render(<NotificationsRow initialSubscribed={false} />)
    await userEvent.click(screen.getByRole('switch'))

    await waitFor(() => {
      expect(mockSubscribeToPush).toHaveBeenCalledWith({ endpoint: 'https://push.example/1' })
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    })
  })

  it('unsubscribes and flips off when switched back', async () => {
    mockHasBrowserPushSubscription.mockResolvedValue(true)
    mockUnsubscribeBrowser.mockResolvedValue('https://push.example/1')
    mockUnsubscribeFromPush.mockResolvedValue({})

    render(<NotificationsRow initialSubscribed={true} />)
    await waitFor(() => expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true'))
    await userEvent.click(screen.getByRole('switch'))

    await waitFor(() => {
      expect(mockUnsubscribeFromPush).toHaveBeenCalledWith('https://push.example/1')
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    })
  })

  it('surfaces a denied permission instead of silently staying off', async () => {
    mockSubscribeBrowser.mockRejectedValue(new Error('Notification permission denied'))

    render(<NotificationsRow initialSubscribed={false} />)
    await userEvent.click(screen.getByRole('switch'))

    await waitFor(() => expect(screen.getByText('Notification permission denied')).toBeInTheDocument())
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  // Still rendered rather than hidden — an absent control is what sent the
  // café looking for a notification setting that appeared not to exist.
  it('stays visible and explains itself when the browser cannot do push', () => {
    mockIsPushSupported.mockReturnValue(false)
    render(<NotificationsRow initialSubscribed={false} />)
    expect(screen.getByText('Order notifications')).toBeInTheDocument()
    expect(screen.getByRole('switch')).toBeDisabled()
    expect(screen.getByText(/can’t show notifications/i)).toBeInTheDocument()
  })

  // Nothing mounts two of these at once now that App Settings has stopped
  // repeating the switch, but the shared hook state this pins is what the
  // home-page prompt banner and the admin toggles rely on.
  it('reflects a subscription made by another control on the page', async () => {
    mockSubscribeBrowser.mockResolvedValue({ toJSON: () => ({ endpoint: 'https://push.example/1' }) })
    mockSubscribeToPush.mockResolvedValue({})

    render(
      <>
        <NotificationsRow initialSubscribed={false} />
        <NotificationsRow initialSubscribed={false} />
      </>,
    )

    await userEvent.click(screen.getAllByRole('switch')[0])

    await waitFor(() => {
      for (const s of screen.getAllByRole('switch')) {
        expect(s).toHaveAttribute('aria-checked', 'true')
      }
    })
  })
})
