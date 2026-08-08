import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BottomNav } from '@/components/cafe/bottom-nav'

let currentPathname = '/'
vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
}))

describe('BottomNav', () => {
  it('shows Home, Cart, and Profile tabs', () => {
    currentPathname = '/'
    render(<BottomNav />)
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /cart/i })).toHaveAttribute('href', '/orders')
    expect(screen.getByRole('link', { name: /profile/i })).toHaveAttribute('href', '/profile')
  })

  it('no longer shows a "Shop", "Orders", or "Settings" label — Settings lives inside Profile', () => {
    currentPathname = '/'
    render(<BottomNav />)
    expect(screen.queryByText('Shop')).not.toBeInTheDocument()
    expect(screen.queryByText('Orders')).not.toBeInTheDocument()
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('renders nothing on drill-down routes like /settings, matching the /orders/[id] convention', () => {
    currentPathname = '/settings'
    const { container } = render(<BottomNav />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing on routes outside the café shell', () => {
    currentPathname = '/login'
    const { container } = render(<BottomNav />)
    expect(container).toBeEmptyDOMElement()
  })
})
