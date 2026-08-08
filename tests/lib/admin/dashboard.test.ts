import { describe, it, expect } from 'vitest'
import {
  computeTopProducts,
  summarizeCafes,
  summarizeDailySales,
  summarizeOrders,
  summarizeOrderStatusCounts,
} from '@/lib/admin/dashboard'

describe('summarizeOrders', () => {
  it('returns all zeros for an empty list', () => {
    expect(summarizeOrders([])).toEqual({
      totalSales: 0,
      totalOrders: 0,
      activeOrders: 0,
      outstandingTotal: 0,
    })
  })

  it('sums total sales and counts orders', () => {
    const result = summarizeOrders([
      { total_amount: 1000, status: 'delivered', payment_status: 'paid' },
      { total_amount: 500, status: 'received', payment_status: 'pending' },
    ])
    expect(result.totalSales).toBe(1500)
    expect(result.totalOrders).toBe(2)
  })

  it('counts received, confirmed, and out_for_delivery as active', () => {
    const result = summarizeOrders([
      { total_amount: 100, status: 'received', payment_status: 'paid' },
      { total_amount: 100, status: 'confirmed', payment_status: 'paid' },
      { total_amount: 100, status: 'out_for_delivery', payment_status: 'paid' },
      { total_amount: 100, status: 'delivered', payment_status: 'paid' },
    ])
    expect(result.activeOrders).toBe(3)
  })

  it('sums total_amount for pending and due orders as outstanding', () => {
    const result = summarizeOrders([
      { total_amount: 200, status: 'delivered', payment_status: 'pending' },
      { total_amount: 300, status: 'delivered', payment_status: 'due' },
      { total_amount: 400, status: 'delivered', payment_status: 'paid' },
    ])
    expect(result.outstandingTotal).toBe(500)
  })
})

describe('summarizeCafes', () => {
  it('returns all zeros for an empty list', () => {
    expect(summarizeCafes([])).toEqual({ activeCafes: 0, pendingCafes: 0 })
  })

  it('counts active and pending cafés separately, ignoring rejected', () => {
    const result = summarizeCafes([
      { status: 'active' },
      { status: 'active' },
      { status: 'pending' },
      { status: 'rejected' },
    ])
    expect(result).toEqual({ activeCafes: 2, pendingCafes: 1 })
  })
})

describe('computeTopProducts', () => {
  it('returns an empty array for no items', () => {
    expect(computeTopProducts([])).toEqual([])
  })

  it('aggregates quantity and revenue per product across multiple line items', () => {
    const result = computeTopProducts([
      { product_id: 'p1', name: 'Whole Milk', quantity: 3, unit_price: 120 },
      { product_id: 'p1', name: 'Whole Milk', quantity: 2, unit_price: 120 },
      { product_id: 'p2', name: 'Espresso Beans', quantity: 1, unit_price: 900 },
    ])
    expect(result).toEqual([
      { product_id: 'p1', name: 'Whole Milk', quantitySold: 5, revenue: 600 },
      { product_id: 'p2', name: 'Espresso Beans', quantitySold: 1, revenue: 900 },
    ])
  })

  it('sorts by quantity sold, descending', () => {
    const result = computeTopProducts([
      { product_id: 'p1', name: 'Low Seller', quantity: 1, unit_price: 100 },
      { product_id: 'p2', name: 'High Seller', quantity: 50, unit_price: 100 },
    ])
    expect(result.map(p => p.product_id)).toEqual(['p2', 'p1'])
  })

  it('respects the limit', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      product_id: `p${i}`,
      name: `Product ${i}`,
      quantity: i + 1,
      unit_price: 10,
    }))
    expect(computeTopProducts(items, 3)).toHaveLength(3)
  })

  it('defaults to the top 5 when no limit is given', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      product_id: `p${i}`,
      name: `Product ${i}`,
      quantity: i + 1,
      unit_price: 10,
    }))
    expect(computeTopProducts(items)).toHaveLength(5)
  })
})

describe('summarizeDailySales', () => {
  const referenceDate = new Date('2026-08-06T12:00:00.000Z')

  it('returns one bucket per day, oldest first, ending on the reference date', () => {
    const result = summarizeDailySales([], 5, referenceDate)
    expect(result.map(d => d.date)).toEqual([
      '2026-08-02',
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
    ])
  })

  it('fills days with no orders as zero', () => {
    const result = summarizeDailySales([], 3, referenceDate)
    expect(result.every(d => d.total === 0)).toBe(true)
  })

  it('sums total_amount for orders on the same day', () => {
    const result = summarizeDailySales(
      [
        { created_at: '2026-08-06T09:00:00.000Z', total_amount: 500 },
        { created_at: '2026-08-06T18:00:00.000Z', total_amount: 300 },
        { created_at: '2026-08-05T10:00:00.000Z', total_amount: 100 },
      ],
      3,
      referenceDate,
    )
    expect(result).toEqual([
      { date: '2026-08-04', total: 0 },
      { date: '2026-08-05', total: 100 },
      { date: '2026-08-06', total: 800 },
    ])
  })

  it('ignores orders outside the requested window', () => {
    const result = summarizeDailySales(
      [{ created_at: '2026-07-01T00:00:00.000Z', total_amount: 999 }],
      3,
      referenceDate,
    )
    expect(result.every(d => d.total === 0)).toBe(true)
  })

  it('defaults to a 30-day window', () => {
    expect(summarizeDailySales([], undefined, referenceDate)).toHaveLength(30)
  })
})

describe('summarizeOrderStatusCounts', () => {
  it('returns zero counts for every status when given no orders', () => {
    expect(summarizeOrderStatusCounts([])).toEqual([
      { status: 'received', count: 0 },
      { status: 'confirmed', count: 0 },
      { status: 'out_for_delivery', count: 0 },
      { status: 'delivered', count: 0 },
    ])
  })

  it('counts orders per status in received -> delivered order', () => {
    const result = summarizeOrderStatusCounts([
      { status: 'delivered' },
      { status: 'received' },
      { status: 'received' },
      { status: 'confirmed' },
    ])
    expect(result).toEqual([
      { status: 'received', count: 2 },
      { status: 'confirmed', count: 1 },
      { status: 'out_for_delivery', count: 0 },
      { status: 'delivered', count: 1 },
    ])
  })
})
