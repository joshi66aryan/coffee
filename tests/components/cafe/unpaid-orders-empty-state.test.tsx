import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UnpaidOrdersEmptyState } from '@/components/cafe/unpaid-orders-empty-state'

describe('UnpaidOrdersEmptyState', () => {
  it('shows the all-paid-up message', () => {
    render(<UnpaidOrdersEmptyState />)
    expect(screen.getByText('All paid up')).toBeInTheDocument()
    expect(screen.getByText('You have no outstanding bills right now.')).toBeInTheDocument()
  })
})
