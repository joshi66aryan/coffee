import { CREDIT_ELIGIBILITY_THRESHOLD, isCreditEligible } from '@/lib/admin/credit-eligibility'

export function CreditEligibilityBadge({ completedOrders }: { completedOrders: number }) {
  const eligible = isCreditEligible(completedOrders)

  return (
    <span
      className={`pill ${eligible ? 'bg-olive-600 text-cream-100' : 'bg-cream-200 text-brand-900'}`}
    >
      {eligible
        ? `Credit eligible · ${completedOrders} completed orders`
        : `Not yet eligible · ${completedOrders}/${CREDIT_ELIGIBILITY_THRESHOLD} completed orders`}
    </span>
  )
}
