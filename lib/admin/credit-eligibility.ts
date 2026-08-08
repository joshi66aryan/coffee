export const CREDIT_ELIGIBILITY_THRESHOLD = 3

export function isCreditEligible(completedOrders: number): boolean {
  return completedOrders >= CREDIT_ELIGIBILITY_THRESHOLD
}
