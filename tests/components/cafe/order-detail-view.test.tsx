import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrderDetailView, type OrderDetailItem } from '@/components/cafe/order-detail-view'
import type { Order } from '@/lib/types'

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'abcd1234-0000-0000-0000-000000000000',
    cafe_id: 'cafe-1',
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

const items: OrderDetailItem[] = [
  {
    id: 'item-1',
    product_id: 'product-1',
    name: 'Whole Milk',
    unit: 'litre',
    quantity: 3,
    unit_price_at_time_of_order: 120,
  },
  {
    id: 'item-2',
    product_id: 'product-2',
    name: 'Espresso Beans',
    unit: 'kg',
    quantity: 2,
    unit_price_at_time_of_order: 600,
  },
]

describe('OrderDetailView', () => {
  it('renders the short order id', () => {
    render(<OrderDetailView order={makeOrder()} items={items} />)
    expect(screen.getByText('#ABCD1234')).toBeInTheDocument()
  })

  it('renders each item with quantity, unit, and line total', () => {
    render(<OrderDetailView order={makeOrder()} items={items} />)
    expect(screen.getByText('Whole Milk')).toBeInTheDocument()
    expect(screen.getByText(/3 litre × Rs\. 120/)).toBeInTheDocument()
    expect(screen.getByText('Rs. 360')).toBeInTheDocument()

    expect(screen.getByText('Espresso Beans')).toBeInTheDocument()
    expect(screen.getByText(/2 kg × Rs\. 600/)).toBeInTheDocument()
    expect(screen.getByText('Rs. 1,200')).toBeInTheDocument()
  })

  it('marks the current status step and leaves later steps inactive', () => {
    render(<OrderDetailView order={makeOrder({ status: 'confirmed' })} items={items} />)
    expect(screen.getByText('Confirmed')).toHaveClass('text-gray-900')
    expect(screen.getByText('Current status')).toBeInTheDocument()
    expect(screen.getByText('Delivered')).toHaveClass('text-gray-300')
  })

  it('shows the payment type and status', () => {
    render(<OrderDetailView order={makeOrder({ payment_type: 'credit', payment_status: 'due' })} items={items} />)
    expect(screen.getByText('credit')).toBeInTheDocument()
    expect(screen.getByText('Due')).toBeInTheDocument()
  })

  it('shows the total amount', () => {
    render(<OrderDetailView order={makeOrder({ total_amount: 4200 })} items={items} />)
    expect(screen.getByText('Rs. 4,200')).toBeInTheDocument()
  })

  it('omits the delivery row when no delivery date is set', () => {
    render(<OrderDetailView order={makeOrder({ delivery_date: null })} items={items} />)
    expect(screen.queryByText('Delivery')).not.toBeInTheDocument()
  })

  it('shows the delivery date when present', () => {
    render(<OrderDetailView order={makeOrder({ delivery_date: '2026-08-05' })} items={items} />)
    expect(screen.getByText('Delivery')).toBeInTheDocument()
    expect(screen.getByText(/Wednesday, Aug 5/)).toBeInTheDocument()
  })

  it('omits the invoice row when no invoice number is set', () => {
    render(<OrderDetailView order={makeOrder({ invoice_number: null })} items={items} />)
    expect(screen.queryByText('Invoice')).not.toBeInTheDocument()
  })

  it('shows the invoice number when present', () => {
    render(<OrderDetailView order={makeOrder({ invoice_number: 'INV-0042' })} items={items} />)
    expect(screen.getByText('INV-0042')).toBeInTheDocument()
  })

  it('shows the invoice number as plain text when no download link is available yet', () => {
    render(<OrderDetailView order={makeOrder({ invoice_number: 'INV-0042' })} items={items} invoice={null} />)
    expect(screen.getByText('INV-0042')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /INV-0042/ })).not.toBeInTheDocument()
  })

  it('renders the invoice number as a download link when a PDF is available', () => {
    render(
      <OrderDetailView
        order={makeOrder({ invoice_number: 'INV-0042' })}
        items={items}
        invoice={{ invoiceNumber: 'INV-0042', downloadUrl: 'https://storage.example.com/invoices/order-1.pdf' }}
      />,
    )
    const link = screen.getByRole('link', { name: /INV-0042/ })
    expect(link).toHaveAttribute('href', 'https://storage.example.com/invoices/order-1.pdf')
    expect(link).toHaveAttribute('target', '_blank')
  })
})
