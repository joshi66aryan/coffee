import type { Cafe } from '@/lib/types'

export function ProfileHeaderCard({
  cafe,
}: {
  cafe: Pick<Cafe, 'name' | 'contact_name' | 'phone'> & { credit_enabled?: boolean }
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
      <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xl shrink-0">
        {cafe.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-400">Hello,</p>
        <p className="text-base font-bold text-gray-900 truncate">{cafe.contact_name}</p>
        <p className="text-sm text-gray-500 truncate">{cafe.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{cafe.phone}</p>
      </div>
      <span
        className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full ${
          cafe.credit_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
        }`}
      >
        {cafe.credit_enabled ? 'Credit Enabled' : 'Pay per Order'}
      </span>
    </div>
  )
}
