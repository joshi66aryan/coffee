import { z } from 'zod'

const MIN_LENGTH = 10

export const strongPasswordSchema = z
  .string()
  .min(MIN_LENGTH, `Password must be at least ${MIN_LENGTH} characters`)
  .superRefine((password, ctx) => {
    const missing: string[] = []
    if (!/[a-z]/.test(password)) missing.push('a lowercase letter')
    if (!/[A-Z]/.test(password)) missing.push('an uppercase letter')
    if (!/[0-9]/.test(password)) missing.push('a number')
    if (!/[^A-Za-z0-9]/.test(password)) missing.push('a special character')

    if (missing.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Password must include ${missing.join(', ')}`,
      })
    }
  })

export type PasswordCriterion = 'length' | 'lowercase' | 'uppercase' | 'number' | 'special'
export type PasswordStrengthLabel = 'Too weak' | 'Weak' | 'Fair' | 'Good' | 'Strong'

export interface PasswordStrength {
  score: number
  criteria: Record<PasswordCriterion, boolean>
  label: PasswordStrengthLabel
}

const STRENGTH_LABELS: PasswordStrengthLabel[] = ['Too weak', 'Too weak', 'Weak', 'Fair', 'Good', 'Strong']

export function getPasswordStrength(password: string): PasswordStrength {
  const criteria: Record<PasswordCriterion, boolean> = {
    length:    password.length >= MIN_LENGTH,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number:    /[0-9]/.test(password),
    special:   /[^A-Za-z0-9]/.test(password),
  }
  const score = Object.values(criteria).filter(Boolean).length

  return { score, criteria, label: STRENGTH_LABELS[score] }
}
