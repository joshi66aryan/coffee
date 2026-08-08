import { describe, it, expect } from 'vitest'
import { formatInvoiceNumber } from '@/lib/invoice/number'

describe('formatInvoiceNumber', () => {
  it('zero-pads single-digit sequence values to 3 digits', () => {
    expect(formatInvoiceNumber(1)).toBe('INV-001')
  })

  it('zero-pads double-digit sequence values to 3 digits', () => {
    expect(formatInvoiceNumber(42)).toBe('INV-042')
  })

  it('does not truncate sequence values beyond 3 digits', () => {
    expect(formatInvoiceNumber(1234)).toBe('INV-1234')
  })
})
