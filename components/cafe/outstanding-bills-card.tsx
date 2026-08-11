import Link from 'next/link'
import { AlertCircle, ChevronRight } from 'lucide-react'

function formatPrice(amount: number) {
  return `Rs. ${amount.toLocaleString('en-IN')}`
}

export function OutstandingBillsCard({ count, totalAmount }: { count: number; totalAmount: number }) {
  return (
    <Link
      href="/profile/orders?filter=unpaid"
      className="flex items-center gap-3.5 rounded-lg border border-red-200 border-l-4 border-l-red-600 bg-red-50 px-4 py-4 transition-colors hover:bg-red-100"
    >
      <AlertCircle className="h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <p className="font-display text-base uppercase leading-none tracking-[0.06em] text-red-900">
          You have {count} outstanding {count === 1 ? 'bill' : 'bills'}
        </p>
        <p className="mt-2 text-xs text-red-700">{formatPrice(totalAmount)} owed</p>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-red-400" />
    </Link>
  )
}
