import { describe, it, expect } from 'vitest'
import {
  isValidDateString,
  parseOrderSort,
  parseOrderStatusFilter,
  splitActiveOrders,
} from '@/lib/admin/order-queue'
import type { AdminOrder } from '@/lib/types'

describe('parseOrderSort', () => {
  it('defaults to created_at / desc when nothing is provided', () => {
    expect(parseOrderSort(undefined, undefined)).toEqual({ sort: 'created_at', dir: 'desc' })
  })

  it('accepts a known sort column', () => {
    expect(parseOrderSort('total_amount', undefined)).toEqual({ sort: 'total_amount', dir: 'desc' })
  })

  it('falls back to created_at for an unknown column', () => {
    expect(parseOrderSort('not_a_column', 'asc')).toEqual({ sort: 'created_at', dir: 'asc' })
  })

  it('accepts asc direction and defaults anything else to desc', () => {
    expect(parseOrderSort('created_at', 'asc')).toEqual({ sort: 'created_at', dir: 'asc' })
    expect(parseOrderSort('created_at', 'sideways')).toEqual({ sort: 'created_at', dir: 'desc' })
  })
})

function makeOrder(overrides: Partial<AdminOrder> = {}): AdminOrder {
  return {
    id: 'order-1',
    cafe_id: 'cafe-1',
    cafe_name: 'Himalayan Brew',
    status: 'received',
    total_amount: 1000,
    payment_type: 'cash',
    payment_status: 'pending',
    invoice_number: null,
    delivery_date: null,
    created_at: '2026-08-01T10:00:00.000Z',
    updated_at: '2026-08-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('splitActiveOrders', () => {
  it('treats received, confirmed, and out_for_delivery as active', () => {
    const orders = [
      makeOrder({ id: '1', status: 'received' }),
      makeOrder({ id: '2', status: 'confirmed' }),
      makeOrder({ id: '3', status: 'out_for_delivery' }),
    ]
    const { active, rest } = splitActiveOrders(orders)
    expect(active).toHaveLength(3)
    expect(rest).toHaveLength(0)
  })

  it('treats delivered as not active', () => {
    const orders = [
      makeOrder({ id: '1', status: 'received' }),
      makeOrder({ id: '2', status: 'delivered' }),
    ]
    const { active, rest } = splitActiveOrders(orders)
    expect(active.map(o => o.id)).toEqual(['1'])
    expect(rest.map(o => o.id)).toEqual(['2'])
  })

  it('returns empty arrays for an empty input', () => {
    expect(splitActiveOrders([])).toEqual({ active: [], rest: [] })
  })
})

describe('parseOrderStatusFilter', () => {
  it('returns undefined when nothing is provided', () => {
    expect(parseOrderStatusFilter(undefined)).toBeUndefined()
  })

  it('accepts each known order status', () => {
    expect(parseOrderStatusFilter('received')).toBe('received')
    expect(parseOrderStatusFilter('confirmed')).toBe('confirmed')
    expect(parseOrderStatusFilter('out_for_delivery')).toBe('out_for_delivery')
    expect(parseOrderStatusFilter('delivered')).toBe('delivered')
  })

  it('returns undefined for an unknown status', () => {
    expect(parseOrderStatusFilter('bogus')).toBeUndefined()
  })
})

describe('isValidDateString', () => {
  it('accepts a well-formed YYYY-MM-DD date', () => {
    expect(isValidDateString('2026-08-06')).toBe(true)
  })

  it('rejects undefined', () => {
    expect(isValidDateString(undefined)).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isValidDateString('')).toBe(false)
  })

  it('rejects a malformed date string', () => {
    expect(isValidDateString('08/06/2026')).toBe(false)
  })

  it('rejects a value that matches the shape but is not a real date', () => {
    expect(isValidDateString('2026-13-40')).toBe(false)
  })
})
