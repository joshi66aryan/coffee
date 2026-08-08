export type OrderFilter = 'all' | 'unpaid'

export function parseOrderFilter(filter?: string): OrderFilter {
  return filter === 'unpaid' ? 'unpaid' : 'all'
}
