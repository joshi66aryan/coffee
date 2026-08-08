import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard } from '@/components/admin/stat-card'

describe('StatCard', () => {
  it('renders the label and value', () => {
    render(<StatCard label="Total Orders" value="42" />)
    expect(screen.getByText('Total Orders')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders as plain content with no link when href is omitted', () => {
    render(<StatCard label="Total Orders" value="42" />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders as a link to href when provided', () => {
    render(<StatCard label="Active Cafés" value="5" href="/admin/cafes" />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/admin/cafes')
  })
})
