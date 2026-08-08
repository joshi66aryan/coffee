import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CreditEligibilityBadge } from '@/components/admin/credit-eligibility-badge'

describe('CreditEligibilityBadge', () => {
  it('shows not-eligible with progress toward the threshold below 3 completed orders', () => {
    render(<CreditEligibilityBadge completedOrders={1} />)
    expect(screen.getByText(/not yet eligible/i)).toBeInTheDocument()
    expect(screen.getByText(/1\/3 completed orders/i)).toBeInTheDocument()
  })

  it('shows eligible at 3 completed orders', () => {
    render(<CreditEligibilityBadge completedOrders={3} />)
    expect(screen.getByText(/credit eligible/i)).toBeInTheDocument()
    expect(screen.getByText(/3 completed orders/i)).toBeInTheDocument()
  })

  it('shows eligible above the threshold', () => {
    render(<CreditEligibilityBadge completedOrders={12} />)
    expect(screen.getByText(/credit eligible/i)).toBeInTheDocument()
  })
})
