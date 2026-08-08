import { describe, it, expect } from 'vitest'
import { renderInvoicePdf } from '@/lib/invoice/pdf'
import type { InvoiceData } from '@/lib/invoice/data'

const invoiceData: InvoiceData = {
  invoiceNumber: 'INV-001',
  orderId: 'abcd1234-0000-0000-0000-000000000000',
  orderDate: '2026-08-01T10:00:00.000Z',
  cafeName: 'Himalayan Brew',
  cafeAddress: 'Thamel, Kathmandu',
  paymentType: 'cash',
  paymentStatus: 'pending',
  totalAmount: 1560,
  items: [
    { name: 'Espresso Beans', unit: 'kg', quantity: 2, unitPrice: 600, lineTotal: 1200 },
    { name: 'Whole Milk', unit: 'litre', quantity: 3, unitPrice: 120, lineTotal: 360 },
  ],
}

describe('renderInvoicePdf', () => {
  it('renders a non-empty PDF buffer starting with the PDF magic bytes', async () => {
    const buffer = await renderInvoicePdf(invoiceData)
    expect(buffer.length).toBeGreaterThan(0)
    expect(buffer.subarray(0, 5).toString('utf-8')).toBe('%PDF-')
  })
})
