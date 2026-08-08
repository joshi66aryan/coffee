import type { OrderStatus } from '@/lib/types'

export const ORDER_STATUS_STEPS: OrderStatus[] = [
  'received',
  'confirmed',
  'out_for_delivery',
  'delivered',
]

export function getStatusStepIndex(status: OrderStatus): number {
  return ORDER_STATUS_STEPS.indexOf(status)
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: 'Received',
  confirmed: 'Confirmed',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
}
