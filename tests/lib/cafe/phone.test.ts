import { describe, it, expect } from 'vitest'
import { toNepalPhone, NEPAL_PHONE_REGEX } from '@/lib/cafe/phone'

describe('toNepalPhone', () => {
  it('prefixes a bare 10-digit number', () => {
    expect(toNepalPhone('9841234567')).toBe('+9779841234567')
  })

  it('strips leading 0 and adds country code', () => {
    expect(toNepalPhone('09841234567')).toBe('+9779841234567')
  })

  it('passes through a fully-formed E.164 number', () => {
    expect(toNepalPhone('+9779841234567')).toBe('+9779841234567')
  })

  it('handles 977 prefix without leading +', () => {
    expect(toNepalPhone('9779841234567')).toBe('+9779841234567')
  })

  it('strips spaces and dashes before formatting', () => {
    expect(toNepalPhone('984 123 4567')).toBe('+9779841234567')
    expect(toNepalPhone('984-123-4567')).toBe('+9779841234567')
  })
})

describe('NEPAL_PHONE_REGEX', () => {
  it('accepts valid Nepal mobile numbers', () => {
    expect(NEPAL_PHONE_REGEX.test('+9779841234567')).toBe(true)   // 10 digits after +977
    expect(NEPAL_PHONE_REGEX.test('+977984123456')).toBe(true)    // 9 digits after +977
  })

  it('rejects numbers without +977 prefix', () => {
    expect(NEPAL_PHONE_REGEX.test('9841234567')).toBe(false)
    expect(NEPAL_PHONE_REGEX.test('+919841234567')).toBe(false)
  })

  it('rejects numbers that are too short or too long', () => {
    expect(NEPAL_PHONE_REGEX.test('+977984123')).toBe(false)   // 8 digits
    expect(NEPAL_PHONE_REGEX.test('+977984123456789')).toBe(false) // too long
  })
})
