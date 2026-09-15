import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignOutRow } from '@/components/cafe/sign-out-row'
import { CART_KEY, SESSION_OWNER_KEY, adoptSessionOwner } from '@/lib/ui/app-storage'

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
  localStorage.clear()
  mockSignOut.mockResolvedValue({})
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

describe('SignOutRow', () => {
  it('offers sign out as a labelled row on the account page', () => {
    render(<SignOutRow />)
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('signs out and hard-navigates to /login', async () => {
    render(<SignOutRow />)

    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledOnce()
      expect(window.location.href).toBe('/login')
    })
  })

  // Otherwise this device keeps announcing order updates for an account that
  // is no longer signed in on it.
  it('stops this browser receiving notifications', async () => {
    mockUnsubscribeBrowser.mockResolvedValue('https://push.example/endpoint-2')

    render(<SignOutRow />)
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))

    await waitFor(() => expect(mockUnsubscribeFromPush).toHaveBeenCalledWith('https://push.example/endpoint-2'))
  })

  // Otherwise the next café to sign in on this device inherits the cart.
  it('leaves nothing behind for the next account', async () => {
    adoptSessionOwner('aaaaaaaa-0000-4000-8000-000000000001')
    localStorage.setItem(CART_KEY, JSON.stringify({ 'product-1': 2 }))

    render(<SignOutRow />)
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))

    await waitFor(() => {
      expect(localStorage.getItem(CART_KEY)).toBeNull()
      expect(localStorage.getItem(SESSION_OWNER_KEY)).toBeNull()
    })
  })
})
