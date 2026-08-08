import Link from 'next/link'
import { AlertCircle, ChevronRight } from 'lucide-react'

function formatPrice(amount: number) {
  return `Rs. ${amount.toLocaleString('en-IN')}`
}

export function OutstandingBillsCard({ count, totalAmount }: { count: number; totalAmount: number }) {
  return (
    <Link
      href="/profile/orders?filter=unpaid"
      className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3.5 hover:bg-red-100/60 active:bg-red-100 transition-colors"
    >
      <span className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
        <AlertCircle className="w-4.5 h-4.5 text-red-600" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-red-900">
          You have {count} outstanding {count === 1 ? 'bill' : 'bills'}
        </p>
        <p className="text-xs text-red-600 mt-0.5">{formatPrice(totalAmount)} owed</p>
      </div>
      <ChevronRight className="w-4 h-4 text-red-300 shrink-0" />
    </Link>
  )
}
