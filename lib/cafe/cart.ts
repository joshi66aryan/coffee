import type { StockStatus } from '@/lib/types'

export function hasOutOfStockItems(items: { stock_status: StockStatus }[]): boolean {
  return items.some(item => item.stock_status === 'out_of_stock')
}
