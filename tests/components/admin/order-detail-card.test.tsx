import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrderDetailCard } from '@/components/admin/order-detail-card'
import type { AdminOrder, OrderLineItem } from '@/lib/types'

function makeOrder(overrides: Partial<AdminOrder> = {}): AdminOrder {
  return {
    id: 'order-1',
    cafe_id: 'cafe-1',
    cafe_name: 'Himalayan Brew',
    status: 'confirmed',
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

const items: OrderLineItem[] = [
  {
    id: 'item-1',
    product_id: 'product-1',
    name: 'Whole Milk',
    unit: 'litre',
    quantity: 3,
    unit_price_at_time_of_order: 120,
  },
]

describe('OrderDetailCard', () => {
  it('renders items with quantity, unit, and line total', () => {
    render(<OrderDetailCard order={makeOrder()} items={items} />)
    expect(screen.getByText('Whole Milk')).toBeInTheDocument()
    expect(screen.getByText(/3 litre × Rs\. 120/)).toBeInTheDocument()
    expect(screen.getByText('Rs. 360')).toBeInTheDocument()
  })

  it('shows payment type and status', () => {
    render(<OrderDetailCard order={makeOrder({ payment_type: 'credit', payment_status: 'due' })} items={items} />)
    expect(screen.getByText('credit')).toBeInTheDocument()
    expect(screen.getByText('Due')).toBeInTheDocument()
  })

  it('shows the total amount', () => {
    render(<OrderDetailCard order={makeOrder({ total_amount: 4200 })} items={items} />)
    expect(screen.getByText('Rs. 4,200')).toBeInTheDocument()
  })

  it('omits delivery and invoice rows when not set', () => {
    render(<OrderDetailCard order={makeOrder({ delivery_date: null, invoice_number: null })} items={items} />)
    expect(screen.queryByText('Delivery')).not.toBeInTheDocument()
    expect(screen.queryByText('Invoice')).not.toBeInTheDocument()
  })

  it('shows delivery date and invoice number when present', () => {
    render(
      <OrderDetailCard
        order={makeOrder({ delivery_date: '2026-08-05', invoice_number: 'INV-0042' })}
        items={items}
      />,
    )
    expect(screen.getByText(/Wednesday, Aug 5/)).toBeInTheDocument()
    expect(screen.getByText('INV-0042')).toBeInTheDocument()
  })

  it('renders the invoice number as a download link when a PDF is available', () => {
    render(
      <OrderDetailCard
        order={makeOrder({ invoice_number: 'INV-0042' })}
        items={items}
        invoice={{ invoiceNumber: 'INV-0042', downloadUrl: 'https://storage.example.com/invoices/order-1.pdf' }}
      />,
    )
    const link = screen.getByRole('link', { name: /INV-0042/ })
    expect(link).toHaveAttribute('href', 'https://storage.example.com/invoices/order-1.pdf')
  })
})
