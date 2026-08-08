import Link from 'next/link'
import { ClipboardList, UserCircle } from 'lucide-react'

export function ProfileQuickNav() {
  return (
    <nav className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide">
      <Link
        href="/profile/orders"
        className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:border-amber-300 hover:text-amber-700 transition-colors"
      >
        <ClipboardList className="w-3.5 h-3.5" />
        Orders
      </Link>
      <Link
        href="/settings"
        className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:border-amber-300 hover:text-amber-700 transition-colors"
      >
        <UserCircle className="w-3.5 h-3.5" />
        Account
      </Link>
    </nav>
  )
}
