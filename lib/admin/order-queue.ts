import type { AdminOrder, OrderStatus } from '@/lib/types'

export const ORDER_SORT_COLUMNS = ['created_at', 'total_amount'] as const
export type OrderSortColumn = (typeof ORDER_SORT_COLUMNS)[number]
export type SortDirection = 'asc' | 'desc'

export function parseOrderSort(
  sort?: string,
  dir?: string,
): { sort: OrderSortColumn; dir: SortDirection } {
  const resolvedSort = (ORDER_SORT_COLUMNS as readonly string[]).includes(sort ?? '')
    ? (sort as OrderSortColumn)
    : 'created_at'
  const resolvedDir: SortDirection = dir === 'asc' ? 'asc' : 'desc'
  return { sort: resolvedSort, dir: resolvedDir }
}

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'received',
  'confirmed',
  'out_for_delivery',
  'delivered',
]

export function parseOrderStatusFilter(status?: string): OrderStatus | undefined {
  return (ORDER_STATUSES as readonly string[]).includes(status ?? '')
    ? (status as OrderStatus)
    : undefined
}

const DATE_STRING_RE = /^\d{4}-\d{2}-\d{2}$/

// Accepts only unambiguous YYYY-MM-DD input (from a <input type="date">) so it can
// be safely interpolated into a Postgres timestamptz comparison without a timezone.
export function isValidDateString(value?: string): value is string {
  return Boolean(value) && DATE_STRING_RE.test(value!) && !Number.isNaN(Date.parse(value!))
}

const ACTIVE_STATUSES: ReadonlySet<OrderStatus> = new Set(['received', 'confirmed', 'out_for_delivery'])

export function splitActiveOrders(orders: AdminOrder[]): {
  active: AdminOrder[]
  rest: AdminOrder[]
} {
  return {
    active: orders.filter(o => ACTIVE_STATUSES.has(o.status)),
    rest: orders.filter(o => !ACTIVE_STATUSES.has(o.status)),
  }
}
