import { describe, it, expect } from 'vitest'
import { parseOrderFilter } from '@/lib/cafe/order-filter'

describe('parseOrderFilter', () => {
  it('defaults to all when nothing is provided', () => {
    expect(parseOrderFilter(undefined)).toBe('all')
  })

  it('accepts unpaid', () => {
    expect(parseOrderFilter('unpaid')).toBe('unpaid')
  })

  it('falls back to all for an unknown value', () => {
    expect(parseOrderFilter('bogus')).toBe('all')
  })
})
