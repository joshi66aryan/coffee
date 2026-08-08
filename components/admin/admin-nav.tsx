'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/cafes', label: 'Cafés' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/payments', label: 'Payments' },
]

function isActive(pathname: string, href: string) {
  if (href === '/admin') {
    return pathname === '/admin'
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminNavDesktop() {
  const pathname = usePathname()

  return (
    <nav className="hidden sm:flex items-center gap-1">
      {NAV_LINKS.map(link => {
        const active = isActive(pathname, link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors active:scale-[0.97] ${
              active
                ? 'text-amber-700 bg-amber-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function AdminNavMobile() {
  const pathname = usePathname()

  return (
    <nav className="sm:hidden flex border-t border-gray-100">
      {NAV_LINKS.map(link => {
        const active = isActive(pathname, link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`flex-1 text-center py-2.5 text-xs font-medium transition-colors active:scale-[0.97] ${
              active
                ? 'text-amber-700 bg-amber-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
