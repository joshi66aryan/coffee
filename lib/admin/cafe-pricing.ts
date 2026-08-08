// Parses the raw text of a price input into a value to persist.
// Empty input means "reset to base price" (null). An invalid or negative
// number returns undefined so the caller can show an error instead of saving.
export function parsePriceInput(raw: string): number | null | undefined {
  const trimmed = raw.trim()
  if (trimmed === '') return null

  const value = Number(trimmed)
  if (Number.isNaN(value) || value < 0) return undefined

  return value
}

export function resolveEffectivePrice(basePrice: number, customPrice: number | null): number {
  return customPrice ?? basePrice
}
