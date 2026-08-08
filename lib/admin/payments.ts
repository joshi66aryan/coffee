import type { PaymentStatus } from '@/lib/types'

export const PAYMENT_FILTERS = ['unpaid', 'paid', 'all'] as const
export type PaymentFilter = (typeof PAYMENT_FILTERS)[number]

export function parsePaymentFilter(filter?: string): PaymentFilter {
  return (PAYMENT_FILTERS as readonly string[]).includes(filter ?? '')
    ? (filter as PaymentFilter)
    : 'unpaid'
}

export function paymentFilterStatuses(filter: PaymentFilter): PaymentStatus[] | null {
  if (filter === 'unpaid') return ['pending', 'due']
  if (filter === 'paid') return ['paid']
  return null
}

export function sumOutstanding(orders: { total_amount: number }[]): number {
  return orders.reduce((sum, o) => sum + o.total_amount, 0)
}
