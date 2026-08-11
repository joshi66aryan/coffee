import { describe, it, expect } from 'vitest'
import { strongPasswordSchema, getPasswordStrength } from '@/lib/cafe/password'

describe('strongPasswordSchema', () => {
  it('accepts a password meeting all requirements', () => {
    expect(strongPasswordSchema.safeParse('Str0ng!Pass').success).toBe(true)
  })

  it('rejects a password shorter than 10 characters', () => {
    const result = strongPasswordSchema.safeParse('Sh0rt!')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/at least 10 characters/i)
    }
  })

  it('rejects common easy passwords lacking complexity', () => {
    for (const easy of ['password', '12345678900', 'lowercaseonly', 'ALLUPPERCASE1']) {
      expect(strongPasswordSchema.safeParse(easy).success).toBe(false)
    }
  })

  it('rejects a password missing an uppercase letter', () => {
    const result = strongPasswordSchema.safeParse('str0ng!pass')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/uppercase letter/i)
    }
  })

  it('rejects a password missing a special character', () => {
    const result = strongPasswordSchema.safeParse('Str0ngPassw')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/special character/i)
    }
  })

  it('rejects a password missing a number', () => {
    const result = strongPasswordSchema.safeParse('Strong!Pass')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/number/i)
    }
  })

  it('lists every missing requirement in one message', () => {
    const result = strongPasswordSchema.safeParse('lowercaseonly')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('an uppercase letter')
      expect(result.error.issues[0].message).toContain('a number')
      expect(result.error.issues[0].message).toContain('a special character')
    }
  })
})

describe('getPasswordStrength', () => {
  it('scores an empty password as 0 with no criteria met', () => {
    const { score, criteria } = getPasswordStrength('')
    expect(score).toBe(0)
    expect(Object.values(criteria).every((met) => met === false)).toBe(true)
  })

  it('labels a password meeting only one criterion as Too weak', () => {
    expect(getPasswordStrength('abc').label).toBe('Too weak')
  })

  it('labels a password meeting all five criteria as Strong', () => {
    const { score, label, criteria } = getPasswordStrength('Str0ng!Pass')
    expect(score).toBe(5)
    expect(label).toBe('Strong')
    expect(criteria).toEqual({
      length: true,
      lowercase: true,
      uppercase: true,
      number: true,
      special: true,
    })
  })

  it('increases the score as more criteria are satisfied', () => {
    const scores = ['a', 'ab12345678', 'Ab12345678', 'Ab123456!8'].map(
      (p) => getPasswordStrength(p).score,
    )
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1])
    }
  })
})
