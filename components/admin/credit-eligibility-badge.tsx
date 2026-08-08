import { CREDIT_ELIGIBILITY_THRESHOLD, isCreditEligible } from '@/lib/admin/credit-eligibility'

export function CreditEligibilityBadge({ completedOrders }: { completedOrders: number }) {
  const eligible = isCreditEligible(completedOrders)

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        eligible ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {eligible
        ? `Credit eligible · ${completedOrders} completed orders`
        : `Not yet eligible · ${completedOrders}/${CREDIT_ELIGIBILITY_THRESHOLD} completed orders`}
    </span>
  )
}
