/**
 * Normalise a user-entered Nepal phone number to E.164 format (+977XXXXXXXXX).
 * Accepts:
 *   - "9841234567"      → "+9779841234567"
 *   - "09841234567"     → "+9779841234567"
 *   - "+9779841234567"  → "+9779841234567" (unchanged)
 *   - "9779841234567"   → "+9779841234567"
 */
export function toNepalPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('977')) return '+' + digits
  if (digits.startsWith('0'))   return '+977' + digits.slice(1)
  return '+977' + digits
}

export const NEPAL_PHONE_REGEX = /^\+977[0-9]{9,10}$/
