import { describe, it, expect } from 'vitest'
import { parsePaymentFilter, paymentFilterStatuses, sumOutstanding } from '@/lib/admin/payments'

describe('parsePaymentFilter', () => {
  it('defaults to unpaid when nothing is provided', () => {
    expect(parsePaymentFilter(undefined)).toBe('unpaid')
  })

  it('accepts known filters', () => {
    expect(parsePaymentFilter('paid')).toBe('paid')
    expect(parsePaymentFilter('all')).toBe('all')
    expect(parsePaymentFilter('unpaid')).toBe('unpaid')
  })

  it('falls back to unpaid for an unknown value', () => {
    expect(parsePaymentFilter('bogus')).toBe('unpaid')
  })
})

describe('paymentFilterStatuses', () => {
  it('maps unpaid to pending and due', () => {
    expect(paymentFilterStatuses('unpaid')).toEqual(['pending', 'due'])
  })

  it('maps paid to paid', () => {
    expect(paymentFilterStatuses('paid')).toEqual(['paid'])
  })

  it('maps all to null (no status filter)', () => {
    expect(paymentFilterStatuses('all')).toBeNull()
  })
})

describe('sumOutstanding', () => {
  it('sums total_amount across orders', () => {
    expect(sumOutstanding([{ total_amount: 100 }, { total_amount: 250 }])).toBe(350)
  })

  it('returns 0 for an empty list', () => {
    expect(sumOutstanding([])).toBe(0)
  })
})
