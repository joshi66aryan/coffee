import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignOutButton } from '@/components/sign-out-button'

const mockSignOut = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signOut: mockSignOut } }),
}))

const mockUnsubscribeBrowser = vi.fn()
vi.mock('@/lib/push/client', () => ({
  unsubscribeBrowserFromPush: () => mockUnsubscribeBrowser(),
}))

const mockUnsubscribeFromPush = vi.fn()
vi.mock('@/lib/push/actions', () => ({
  unsubscribeFromPush: (...args: unknown[]) => mockUnsubscribeFromPush(...args),
}))

const originalLocation = window.location

beforeEach(() => {
  vi.clearAllMocks()
  mockUnsubscribeBrowser.mockResolvedValue(null)
  mockUnsubscribeFromPush.mockResolvedValue({})
  Object.defineProperty(window, 'location', {
    writable: true,
    configurable: true,
    value: { ...originalLocation, href: '' },
  })
})

afterEach(() => {
  Object.defineProperty(window, 'location', {
    writable: true,
    configurable: true,
    value: originalLocation,
  })
})

describe('SignOutButton', () => {
  it('signs out and hard-navigates to /login when clicked', async () => {
    mockSignOut.mockResolvedValue({})
    render(<SignOutButton />)

    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledOnce()
      expect(window.location.href).toBe('/login')
    })
  })

  it('hides the text label by default', () => {
    render(<SignOutButton />)
    expect(screen.queryByText('Sign out')).not.toBeInTheDocument()
  })

  it('shows the text label when showLabel is set', () => {
    render(<SignOutButton showLabel />)
    expect(screen.getByText('Sign out')).toBeInTheDocument()
  })

  it('applies a custom className when provided', () => {
    render(<SignOutButton className="my-custom-class" />)
    expect(screen.getByRole('button', { name: /sign out/i })).toHaveClass('my-custom-class')
  })
})

// A subscription left alive in a browser that has been signed out keeps
// announcing every new order — which is how one order arrived twice on one
// machine, once in the browser in use and once in an abandoned one.
describe('SignOutButton — notifications', () => {
  it('stops this browser receiving notifications, before the session ends', async () => {
    mockUnsubscribeBrowser.mockResolvedValue('https://push.example/endpoint-1')
    render(<SignOutButton />)

    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledOnce())
    expect(mockUnsubscribeFromPush).toHaveBeenCalledWith('https://push.example/endpoint-1')
    // The row is deleted under the caller's own RLS, so it has to go while the
    // session is still valid.
    expect(mockUnsubscribeFromPush.mock.invocationCallOrder[0]).toBeLessThan(
      mockSignOut.mock.invocationCallOrder[0],
    )
  })

  it('leaves the server alone when this browser was never subscribed', async () => {
    render(<SignOutButton />)

    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))

    await waitFor(() => expect(window.location.href).toBe('/login'))
    expect(mockUnsubscribeFromPush).not.toHaveBeenCalled()
  })

  it('still signs out when the push teardown fails', async () => {
    mockUnsubscribeBrowser.mockRejectedValue(new Error('push service unreachable'))
    render(<SignOutButton />)

    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledOnce()
      expect(window.location.href).toBe('/login')
    })
  })

  it('still signs out when the subscription row cannot be deleted', async () => {
    mockUnsubscribeBrowser.mockResolvedValue('https://push.example/endpoint-1')
    mockUnsubscribeFromPush.mockResolvedValue({ error: 'Not authenticated' })
    render(<SignOutButton />)

    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledOnce()
      expect(window.location.href).toBe('/login')
    })
  })
})
