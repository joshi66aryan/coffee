import { describe, it, expect } from 'vitest'
import { hasOutOfStockItems } from '@/lib/cafe/cart'

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
