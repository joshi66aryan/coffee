import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignOutButton } from '@/components/sign-out-button'

const mockSignOut = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signOut: mockSignOut } }),
}))

const originalLocation = window.location

beforeEach(() => {
  vi.clearAllMocks()
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
