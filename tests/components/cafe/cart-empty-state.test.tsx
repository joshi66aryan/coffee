import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { CartEmptyState } from '@/components/cafe/cart-empty-state'

beforeEach(() => {
  localStorage.clear()
})

describe('CartEmptyState', () => {
  it('shows the browse-catalog prompt when the cart is empty', async () => {
    render(<CartEmptyState />)
    await waitFor(() => {
      expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /browse catalog/i })).toHaveAttribute('href', '/')
  })

  it('renders nothing once it detects items already in the cart', async () => {
    localStorage.setItem('sherpa-cart', JSON.stringify({ 'product-1': 2 }))
    render(<CartEmptyState />)
    await waitFor(() => {
      expect(screen.queryByText('Your cart is empty')).not.toBeInTheDocument()
    })
  })
})
