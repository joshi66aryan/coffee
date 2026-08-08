import { ORDER_STATUSES } from '@/lib/admin/order-queue'
import type { CafeStatus, OrderStatus, PaymentStatus } from '@/lib/types'

const ACTIVE_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set(['received', 'confirmed', 'out_for_delivery'])
const OUTSTANDING_PAYMENT_STATUSES: ReadonlySet<PaymentStatus> = new Set(['pending', 'due'])

export interface OrderSummaryInput {
  total_amount: number
  status: OrderStatus
  payment_status: PaymentStatus
}

export interface OrderSummary {
  totalSales: number
  totalOrders: number
  activeOrders: number
  outstandingTotal: number
}

export function summarizeOrders(orders: OrderSummaryInput[]): OrderSummary {
  return orders.reduce<OrderSummary>(
    (acc, order) => ({
      totalSales: acc.totalSales + order.total_amount,
      totalOrders: acc.totalOrders + 1,
      activeOrders: acc.activeOrders + (ACTIVE_ORDER_STATUSES.has(order.status) ? 1 : 0),
      outstandingTotal:
        acc.outstandingTotal + (OUTSTANDING_PAYMENT_STATUSES.has(order.payment_status) ? order.total_amount : 0),
    }),
    { totalSales: 0, totalOrders: 0, activeOrders: 0, outstandingTotal: 0 },
  )
}

export interface CafeSummaryInput {
  status: CafeStatus
}

export interface CafeSummary {
  activeCafes: number
  pendingCafes: number
}

export function summarizeCafes(cafes: CafeSummaryInput[]): CafeSummary {
  return cafes.reduce<CafeSummary>(
    (acc, cafe) => ({
      activeCafes: acc.activeCafes + (cafe.status === 'active' ? 1 : 0),
      pendingCafes: acc.pendingCafes + (cafe.status === 'pending' ? 1 : 0),
    }),
    { activeCafes: 0, pendingCafes: 0 },
  )
}

export interface OrderItemSummaryInput {
  product_id: string
  name: string
  quantity: number
  unit_price: number
}

export interface TopProduct {
  product_id: string
  name: string
  quantitySold: number
  revenue: number
}

export const TOP_PRODUCTS_LIMIT = 5

export function computeTopProducts(
  items: OrderItemSummaryInput[],
  limit: number = TOP_PRODUCTS_LIMIT,
): TopProduct[] {
  const byProduct = new Map<string, TopProduct>()

  for (const item of items) {
    const revenue = item.quantity * item.unit_price
    const existing = byProduct.get(item.product_id)
    if (existing) {
      existing.quantitySold += item.quantity
      existing.revenue += revenue
    } else {
      byProduct.set(item.product_id, {
        product_id: item.product_id,
        name: item.name,
        quantitySold: item.quantity,
        revenue,
      })
    }
  }

  return Array.from(byProduct.values())
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, limit)
}

export interface DailySalesInput {
  created_at: string
  total_amount: number
}

export interface DailySales {
  date: string
  total: number
}

export const SALES_TREND_DAYS = 30

export function summarizeDailySales(
  orders: DailySalesInput[],
  days: number = SALES_TREND_DAYS,
  referenceDate: Date = new Date(),
): DailySales[] {
  const totals = new Map<string, number>()
  for (const order of orders) {
    const date = order.created_at.slice(0, 10)
    totals.set(date, (totals.get(date) ?? 0) + order.total_amount)
  }

  const result: DailySales[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(referenceDate)
    d.setUTCDate(d.getUTCDate() - i)
    const date = d.toISOString().slice(0, 10)
    result.push({ date, total: totals.get(date) ?? 0 })
  }
  return result
}

export interface StatusCountInput {
  status: OrderStatus
}

export interface StatusCount {
  status: OrderStatus
  count: number
}

// Fixed order (received → delivered) so the chart reads as a funnel/ordinal
// stage sequence rather than an arbitrary categorical ranking.
export function summarizeOrderStatusCounts(orders: StatusCountInput[]): StatusCount[] {
  const counts = new Map<OrderStatus, number>()
  for (const order of orders) {
    counts.set(order.status, (counts.get(order.status) ?? 0) + 1)
  }
  return ORDER_STATUSES.map(status => ({ status, count: counts.get(status) ?? 0 }))
}

export interface DashboardStats extends OrderSummary, CafeSummary {
  topProducts: TopProduct[]
  salesTrend: DailySales[]
  statusCounts: StatusCount[]
}
