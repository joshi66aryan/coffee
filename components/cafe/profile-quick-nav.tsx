import Link from 'next/link'
import { ClipboardList, UserCircle } from 'lucide-react'

const LINKS = [
  { href: '/profile/orders', label: 'Orders', icon: ClipboardList },
  { href: '/settings', label: 'Account', icon: UserCircle },
]

export function ProfileQuickNav() {
  return (
    <nav className="scrollbar-hide flex gap-2 overflow-x-auto">
      {LINKS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="chip shrink-0 gap-2">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
