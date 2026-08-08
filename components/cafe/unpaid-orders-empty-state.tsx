import { CheckCircle2 } from 'lucide-react'

export function UnpaidOrdersEmptyState() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
        <CheckCircle2 className="w-7 h-7 text-emerald-500" />
      </div>
      <p className="font-semibold text-gray-700">You&apos;re all paid up!</p>
      <p className="text-sm text-gray-400 mt-1">No outstanding bills right now.</p>
    </div>
  )
}
