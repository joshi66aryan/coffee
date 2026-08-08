import { describe, it, expect } from 'vitest'
import { summarizeOutstandingBills } from '@/lib/cafe/outstanding-bills'

describe('summarizeOutstandingBills', () => {
  it('returns zero count and total for no orders', () => {
    expect(summarizeOutstandingBills([])).toEqual({ count: 0, totalAmount: 0 })
  })

  it('counts orders and sums their totals', () => {
    const result = summarizeOutstandingBills([
      { total_amount: 1200 },
      { total_amount: 350 },
      { total_amount: 80 },
    ])
    expect(result).toEqual({ count: 3, totalAmount: 1630 })
  })

  it('handles a single outstanding order', () => {
    expect(summarizeOutstandingBills([{ total_amount: 500 }])).toEqual({ count: 1, totalAmount: 500 })
  })
})
