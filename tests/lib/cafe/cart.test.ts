import { describe, it, expect } from 'vitest'
import { hasOutOfStockItems, isProfileComplete, isLargeOrder, LARGE_ORDER_THRESHOLD } from '@/lib/cafe/cart'

describe('hasOutOfStockItems', () => {
  it('returns false for an empty cart', () => {
    expect(hasOutOfStockItems([])).toBe(false)
  })

  it('returns false when every item is in stock or low', () => {
    expect(hasOutOfStockItems([{ stock_status: 'in_stock' }, { stock_status: 'low' }])).toBe(false)
  })

  it('returns true when any item is out of stock', () => {
    expect(
      hasOutOfStockItems([{ stock_status: 'in_stock' }, { stock_status: 'out_of_stock' }]),
    ).toBe(true)
  })
})

describe('isProfileComplete', () => {
  it('returns true when both phone and delivery address are set', () => {
    expect(isProfileComplete({ phone: '+9779800000000', delivery_address: 'Ward 26, Thamel' })).toBe(true)
  })

  it('returns false when phone is empty', () => {
    expect(isProfileComplete({ phone: '', delivery_address: 'Ward 26, Thamel' })).toBe(false)
  })

  it('returns false when delivery address is empty', () => {
    expect(isProfileComplete({ phone: '+9779800000000', delivery_address: '' })).toBe(false)
  })

  it('returns false when a field is only whitespace', () => {
    expect(isProfileComplete({ phone: '   ', delivery_address: 'Ward 26, Thamel' })).toBe(false)
  })
})

describe('isLargeOrder', () => {
  it('returns false at or below the threshold', () => {
    expect(isLargeOrder(LARGE_ORDER_THRESHOLD)).toBe(false)
    expect(isLargeOrder(LARGE_ORDER_THRESHOLD - 1)).toBe(false)
  })

  it('returns true above the threshold', () => {
    expect(isLargeOrder(LARGE_ORDER_THRESHOLD + 1)).toBe(true)
  })
})
