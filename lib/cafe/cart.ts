import type { StockStatus } from '@/lib/types'

export function hasOutOfStockItems(items: { stock_status: StockStatus }[]): boolean {
  return items.some(item => item.stock_status === 'out_of_stock')
}

export function isProfileComplete(cafe: { phone: string; delivery_address: string }): boolean {
  return cafe.phone.trim().length > 0 && cafe.delivery_address.trim().length > 0
}

// A confirmation step before placing an order above this amount — catches
// fat-finger quantity mistakes before they reach the kitchen/delivery queue.
export const LARGE_ORDER_THRESHOLD = 20000

export function isLargeOrder(total: number): boolean {
  return total > LARGE_ORDER_THRESHOLD
}
