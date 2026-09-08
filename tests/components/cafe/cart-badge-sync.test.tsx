import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { BottomNav } from '@/components/cafe/bottom-nav'
import { setCart, clearCart } from '@/lib/cafe/cart-store'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

// The badge used to be driven by a 500ms setInterval in each component that
// showed it. These assert the replacement: the shared store pushes updates,
// and no timers are left running.
describe('cart badge', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the stored cart quantity on first render', () => {
    localStorage.setItem('sherpa-cart', JSON.stringify({ 'product-1': 2, 'product-2': 3 }))
    render(<BottomNav />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows no badge when the cart is empty', () => {
    render(<BottomNav />)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('updates as soon as the cart changes, without waiting for a poll', () => {
    render(<BottomNav />)

    act(() => {
      setCart({ 'product-1': 4 })
    })

    // No timer advance — the store notified synchronously.
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('clears the badge when the cart is emptied', () => {
    localStorage.setItem('sherpa-cart', JSON.stringify({ 'product-1': 2 }))
    render(<BottomNav />)
    expect(screen.getByText('2')).toBeInTheDocument()

    act(() => {
      clearCart()
    })

    expect(screen.queryByText('2')).not.toBeInTheDocument()
  })

  // The old implementation would have picked this up within 500ms. Nothing
  // polls any more, so a write that bypasses the store is invisible until
  // something notifies — which is the contract: all cart writes go through
  // setCart/updateCart/clearCart.
  it('does not poll for writes made behind the store', () => {
    render(<BottomNav />)

    act(() => {
      localStorage.setItem('sherpa-cart', JSON.stringify({ 'product-1': 9 }))
      vi.advanceTimersByTime(2_000)
    })

    expect(screen.queryByText('9')).not.toBeInTheDocument()
  })
})
