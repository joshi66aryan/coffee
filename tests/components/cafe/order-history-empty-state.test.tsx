import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrderHistoryEmptyState } from '@/components/cafe/order-history-empty-state'

describe('OrderHistoryEmptyState', () => {
  it('shows the no-orders message and a link back to the catalog', () => {
    render(<OrderHistoryEmptyState />)
    expect(screen.getByText('No orders yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse catalog/i })).toHaveAttribute('href', '/')
  })
})
