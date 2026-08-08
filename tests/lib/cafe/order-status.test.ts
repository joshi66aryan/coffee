import { describe, it, expect } from 'vitest'
import { ORDER_STATUS_STEPS, getStatusStepIndex } from '@/lib/cafe/order-status'

describe('getStatusStepIndex', () => {
  it('returns the correct index for each known status', () => {
    expect(getStatusStepIndex('received')).toBe(0)
    expect(getStatusStepIndex('confirmed')).toBe(1)
    expect(getStatusStepIndex('out_for_delivery')).toBe(2)
    expect(getStatusStepIndex('delivered')).toBe(3)
  })

  it('stays in sync with ORDER_STATUS_STEPS ordering', () => {
    ORDER_STATUS_STEPS.forEach((status, index) => {
      expect(getStatusStepIndex(status)).toBe(index)
    })
  })
})
