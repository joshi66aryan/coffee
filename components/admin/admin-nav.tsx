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
    <nav className="hidden items-center gap-1 sm:flex">
      {NAV_LINKS.map(link => {
        const active = isActive(pathname, link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`relative px-3 py-2 font-display text-sm uppercase tracking-[0.14em] transition-colors ${
              active ? 'text-brand-400' : 'text-cream-200/65 hover:text-cream-50'
            }`}
          >
            {link.label}
            <span
              className={`absolute inset-x-2 -bottom-px h-0.5 origin-left bg-brand-400 transition-transform duration-200 ${
                active ? 'scale-x-100' : 'scale-x-0'
              }`}
            />
          </Link>
        )
      })}
    </nav>
  )
}

export function AdminNavMobile() {
  const pathname = usePathname()

  return (
    <nav className="scrollbar-hide flex overflow-x-auto border-t border-cream-200/15 sm:hidden">
      {NAV_LINKS.map(link => {
        const active = isActive(pathname, link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`relative flex-1 whitespace-nowrap px-3 py-3 text-center font-display text-xs uppercase tracking-[0.14em] transition-colors ${
              active ? 'text-brand-400' : 'text-cream-200/60'
            }`}
          >
            {link.label}
            <span
              className={`absolute inset-x-2 bottom-0 h-0.5 origin-left bg-brand-400 transition-transform duration-200 ${
                active ? 'scale-x-100' : 'scale-x-0'
              }`}
            />
          </Link>
        )
      })}
    </nav>
  )
}
