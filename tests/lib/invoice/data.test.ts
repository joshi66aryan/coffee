import { describe, it, expect } from 'vitest'
import { buildInvoiceData } from '@/lib/invoice/data'

const order = {
  id: 'order-1',
  created_at: '2026-08-01T10:00:00.000Z',
  total_amount: 1560,
  payment_type: 'cash' as const,
  payment_status: 'pending' as const,
}

const cafe = { name: 'Himalayan Brew', delivery_address: 'Thamel, Kathmandu' }

describe('buildInvoiceData', () => {
  it('carries invoice, order, and café details through unchanged', () => {
    const data = buildInvoiceData({ invoiceNumber: 'INV-001', order, cafe, items: [] })
    expect(data.invoiceNumber).toBe('INV-001')
    expect(data.orderId).toBe('order-1')
    expect(data.orderDate).toBe(order.created_at)
    expect(data.cafeName).toBe('Himalayan Brew')
    expect(data.cafeAddress).toBe('Thamel, Kathmandu')
    expect(data.paymentType).toBe('cash')
    expect(data.paymentStatus).toBe('pending')
    expect(data.totalAmount).toBe(1560)
  })

  it('computes a line total per item from quantity and unit price', () => {
    const data = buildInvoiceData({
      invoiceNumber: 'INV-001',
      order,
      cafe,
      items: [
        { name: 'Espresso Beans', unit: 'kg', quantity: 2, unit_price_at_time_of_order: 600 },
        { name: 'Whole Milk', unit: 'litre', quantity: 3, unit_price_at_time_of_order: 120 },
      ],
    })

    expect(data.items).toEqual([
      { name: 'Espresso Beans', unit: 'kg', quantity: 2, unitPrice: 600, lineTotal: 1200 },
      { name: 'Whole Milk', unit: 'litre', quantity: 3, unitPrice: 120, lineTotal: 360 },
    ])
  })

  it('returns an empty items array when there are no line items', () => {
    const data = buildInvoiceData({ invoiceNumber: 'INV-001', order, cafe, items: [] })
    expect(data.items).toEqual([])
  })
})
