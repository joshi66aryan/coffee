import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OutstandingBillsCard } from '@/components/cafe/outstanding-bills-card'

describe('OutstandingBillsCard', () => {
  it('shows the bill count and total amount owed', () => {
    render(<OutstandingBillsCard count={2} totalAmount={3400} />)
    expect(screen.getByText('You have 2 outstanding bills')).toBeInTheDocument()
    expect(screen.getByText('Rs. 3,400 owed')).toBeInTheDocument()
  })

  it('uses singular wording for a single bill', () => {
    render(<OutstandingBillsCard count={1} totalAmount={500} />)
    expect(screen.getByText('You have 1 outstanding bill')).toBeInTheDocument()
  })

  it('links to the unpaid orders filter', () => {
    render(<OutstandingBillsCard count={1} totalAmount={500} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/profile/orders?filter=unpaid')
  })
})
