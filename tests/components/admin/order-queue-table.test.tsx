import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrderQueueTable } from '@/components/admin/order-queue-table'
import type { AdminOrder } from '@/lib/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@/lib/admin/actions', () => ({
  updatePaymentStatus: vi.fn(),
}))

function makeOrder(overrides: Partial<AdminOrder> = {}): AdminOrder {
  return {
    id: 'abcd1234-0000-0000-0000-000000000000',
    cafe_id: 'cafe-1',
    cafe_name: 'Himalayan Brew',
    status: 'received',
    total_amount: 1500,
    payment_type: 'cash',
    payment_status: 'pending',
    invoice_number: null,
    delivery_date: null,
    created_at: '2026-08-01T10:00:00.000Z',
    updated_at: '2026-08-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('OrderQueueTable', () => {
  it('shows an empty state when there are no orders', () => {
    render(<OrderQueueTable orders={[]} sort="created_at" dir="desc" basePath="/admin" />)
    expect(screen.getByText('No orders here.')).toBeInTheDocument()
  })

  it('renders café name, short order id, status, payment, and total', () => {
    render(
      <OrderQueueTable
        orders={[makeOrder({ payment_type: 'credit', payment_status: 'due', total_amount: 2500 })]}
        sort="created_at"
        dir="desc"
        basePath="/admin"
      />,
    )
    expect(screen.getByText('Himalayan Brew')).toBeInTheDocument()
    expect(screen.getByText('#ABCD1234')).toBeInTheDocument()
    expect(screen.getByText('Received')).toBeInTheDocument()
    expect(screen.getByText('credit')).toBeInTheDocument()
    expect(screen.getByText('Due')).toBeInTheDocument()
    expect(screen.getByText('Rs. 2,500')).toBeInTheDocument()
  })

  it('links each row to its admin order detail page', () => {
    render(
      <OrderQueueTable orders={[makeOrder()]} sort="created_at" dir="desc" basePath="/admin" />,
    )
    expect(screen.getByRole('link', { name: /view/i })).toHaveAttribute(
      'href',
      '/admin/orders/abcd1234-0000-0000-0000-000000000000',
    )
  })

  it('marks the active sort column with a direction indicator and flips it on click target', () => {
    render(
      <OrderQueueTable orders={[makeOrder()]} sort="total_amount" dir="asc" basePath="/admin" />,
    )
    const totalHeader = screen.getByRole('link', { name: /total/i })
    expect(totalHeader).toHaveAttribute('href', '/admin?sort=total_amount&dir=desc')

    const placedHeader = screen.getByRole('link', { name: /placed/i })
    expect(placedHeader).toHaveAttribute('href', '/admin?sort=created_at&dir=desc')
  })

  it('shows a static payment badge by default', () => {
    render(
      <OrderQueueTable orders={[makeOrder({ payment_status: 'due' })]} sort="created_at" dir="desc" basePath="/admin" />,
    )
    expect(screen.getByText('Due')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders an interactive payment status toggle when editablePayment is set', () => {
    render(
      <OrderQueueTable
        orders={[makeOrder({ payment_status: 'due' })]}
        sort="created_at"
        dir="desc"
        basePath="/admin/payments"
        editablePayment
      />,
    )
    expect(screen.getByRole('button', { name: 'Due' })).toBeInTheDocument()
  })
})
