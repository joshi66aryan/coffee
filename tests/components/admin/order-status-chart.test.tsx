import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrderStatusChart } from '@/components/admin/order-status-chart'
import type { StatusCount } from '@/lib/admin/dashboard'

const counts: StatusCount[] = [
  { status: 'received', count: 2 },
  { status: 'confirmed', count: 1 },
  { status: 'out_for_delivery', count: 0 },
  { status: 'delivered', count: 5 },
]

describe('OrderStatusChart', () => {
  it('shows an empty state when every status is zero', () => {
    render(<OrderStatusChart counts={counts.map(c => ({ ...c, count: 0 }))} />)
    expect(screen.getByText(/no orders yet/i)).toBeInTheDocument()
  })

  it('renders a label for every status', () => {
    render(<OrderStatusChart counts={counts} />)
    expect(screen.getByText('Received')).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    expect(screen.getByText('Out for Delivery')).toBeInTheDocument()
    expect(screen.getByText('Delivered')).toBeInTheDocument()
  })

  it('renders the count for each status as a direct label', () => {
    render(<OrderStatusChart counts={counts} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})
