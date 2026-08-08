import type { PaymentStatus, PaymentType } from '@/lib/types'

export interface InvoiceLineItem {
  name: string
  unit: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface InvoiceData {
  invoiceNumber: string
  orderId: string
  orderDate: string
  cafeName: string
  cafeAddress: string
  paymentType: PaymentType
  paymentStatus: PaymentStatus
  items: InvoiceLineItem[]
  totalAmount: number
}

export function buildInvoiceData(input: {
  invoiceNumber: string
  order: {
    id: string
    created_at: string
    total_amount: number
    payment_type: PaymentType
    payment_status: PaymentStatus
  }
  cafe: { name: string; delivery_address: string }
  items: { name: string; unit: string; quantity: number; unit_price_at_time_of_order: number }[]
}): InvoiceData {
  return {
    invoiceNumber: input.invoiceNumber,
    orderId: input.order.id,
    orderDate: input.order.created_at,
    cafeName: input.cafe.name,
    cafeAddress: input.cafe.delivery_address,
    paymentType: input.order.payment_type,
    paymentStatus: input.order.payment_status,
    totalAmount: input.order.total_amount,
    items: input.items.map(item => ({
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unit_price_at_time_of_order,
      lineTotal: item.quantity * item.unit_price_at_time_of_order,
    })),
  }
}
