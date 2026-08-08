import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrderHistoryList } from '@/components/cafe/order-history-list'
import type { OrderWithPreview } from '@/lib/types'

function makeOrder(overrides: Partial<OrderWithPreview> = {}): OrderWithPreview {
  return {
    id: 'abcd1234-0000-0000-0000-000000000000',
    cafe_id: 'cafe-1',
    status: 'received',
    total_amount: 1500,
    payment_type: 'cash',
    payment_status: 'pending',
    invoice_number: null,
    delivery_date: null,
    created_at: '2026-08-01T10:00:00.000Z',
    updated_at: '2026-08-01T10:00:00.000Z',
    items: [],
    ...overrides,
  }
}

describe('OrderHistoryList', () => {
  it('renders each order with short id, status, total, and payment type', () => {
    render(<OrderHistoryList orders={[makeOrder({ status: 'confirmed', payment_type: 'credit' })]} />)
    expect(screen.getByText('#ABCD1234')).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    expect(screen.getByText('Rs. 1,500')).toBeInTheDocument()
    expect(screen.getByText('credit')).toBeInTheDocument()
  })

  it('links each order to its detail page', () => {
    render(<OrderHistoryList orders={[makeOrder()]} />)
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/orders/abcd1234-0000-0000-0000-000000000000',
    )
  })

  it('shows the first product name and image when items are present', () => {
    render(
      <OrderHistoryList
        orders={[
          makeOrder({
            items: [
              { product_id: 'p1', name: 'Whole Milk', image_url: 'https://example.com/milk.jpg', quantity: 2 },
            ],
          }),
        ]}
      />,
    )
    expect(screen.getByText('Whole Milk')).toBeInTheDocument()
    expect(screen.getByAltText('Whole Milk')).toHaveAttribute('src', 'https://example.com/milk.jpg')
  })

  it('summarizes multiple items as "+N more"', () => {
    render(
      <OrderHistoryList
        orders={[
          makeOrder({
            items: [
              { product_id: 'p1', name: 'Whole Milk', image_url: null, quantity: 2 },
              { product_id: 'p2', name: 'Espresso Beans', image_url: null, quantity: 1 },
            ],
          }),
        ]}
      />,
    )
    expect(screen.getByText('Whole Milk +1 more')).toBeInTheDocument()
  })

  it('renders a fallback icon and no item line when there are no items', () => {
    render(<OrderHistoryList orders={[makeOrder({ items: [] })]} />)
    expect(screen.getByText('☕')).toBeInTheDocument()
  })
})
