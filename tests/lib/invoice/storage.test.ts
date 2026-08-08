import { describe, it, expect } from 'vitest'
import { invoicePdfPath } from '@/lib/invoice/storage'

describe('invoicePdfPath', () => {
  it('scopes the PDF path under the café folder for storage RLS', () => {
    expect(invoicePdfPath('cafe-1', 'order-1')).toBe('cafe-1/order-1.pdf')
  })
})
