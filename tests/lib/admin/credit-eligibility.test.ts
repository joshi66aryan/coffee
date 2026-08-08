import { describe, it, expect } from 'vitest'
import { CREDIT_ELIGIBILITY_THRESHOLD, isCreditEligible } from '@/lib/admin/credit-eligibility'

describe('isCreditEligible', () => {
  it('is not eligible below the threshold', () => {
    expect(isCreditEligible(0)).toBe(false)
    expect(isCreditEligible(CREDIT_ELIGIBILITY_THRESHOLD - 1)).toBe(false)
  })

  it('is eligible at the threshold', () => {
    expect(isCreditEligible(CREDIT_ELIGIBILITY_THRESHOLD)).toBe(true)
  })

  it('is eligible above the threshold', () => {
    expect(isCreditEligible(CREDIT_ELIGIBILITY_THRESHOLD + 10)).toBe(true)
  })
})
