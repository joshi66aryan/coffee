import { describe, it, expect } from 'vitest'
import { parsePriceInput, resolveEffectivePrice } from '@/lib/admin/cafe-pricing'

describe('parsePriceInput', () => {
  it('parses a valid positive number', () => {
    expect(parsePriceInput('150')).toBe(150)
    expect(parsePriceInput('  99.5  ')).toBe(99.5)
  })

  it('treats empty input as a reset to base price (null)', () => {
    expect(parsePriceInput('')).toBeNull()
    expect(parsePriceInput('   ')).toBeNull()
  })

  it('returns undefined for a negative number', () => {
    expect(parsePriceInput('-5')).toBeUndefined()
  })

  it('returns undefined for non-numeric input', () => {
    expect(parsePriceInput('abc')).toBeUndefined()
  })

  it('accepts zero', () => {
    expect(parsePriceInput('0')).toBe(0)
  })
})

describe('resolveEffectivePrice', () => {
  it('returns the custom price when set', () => {
    expect(resolveEffectivePrice(100, 80)).toBe(80)
  })

  it('falls back to the base price when custom price is null', () => {
    expect(resolveEffectivePrice(100, null)).toBe(100)
  })

  it('allows a custom price of zero to override the base price', () => {
    expect(resolveEffectivePrice(100, 0)).toBe(0)
  })
})
