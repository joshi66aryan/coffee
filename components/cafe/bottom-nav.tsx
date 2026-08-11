'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CAFE_NAV_ITEMS } from '@/lib/cafe/nav-items'

const SHOW_ON = ['/', '/orders', '/profile']

export function BottomNav() {
  const pathname = usePathname()
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    function readCart() {
      try {
        const stored = localStorage.getItem('sherpa-cart')
        if (!stored) { setCartCount(0); return }
        const qty: Record<string, number> = JSON.parse(stored)
        setCartCount(Object.values(qty).reduce((sum, n) => sum + n, 0))
      } catch {
        setCartCount(0)
      }
    }
    readCart()
    window.addEventListener('storage', readCart)
    // Poll every 500ms to catch same-tab updates
    const interval = setInterval(readCart, 500)
    return () => { window.removeEventListener('storage', readCart); clearInterval(interval) }
  }, [])

  if (!SHOW_ON.includes(pathname)) return null

  return (
    // Only visible on mobile — sm+ uses the CafeHeader nav
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 bg-brand-900 pb-[env(safe-area-inset-bottom)] sm:hidden">
      {CAFE_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        const showBadge = href === '/orders' && cartCount > 0

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`relative flex flex-1 flex-col items-center justify-center gap-1.5 transition-colors ${
              active ? 'text-brand-400' : 'text-cream-200/55'
            }`}
          >
            {/* Golden cap marks the active destination. */}
            <span
              className={`absolute inset-x-5 top-0 h-0.5 bg-brand-400 transition-transform duration-200 ${
                active ? 'scale-x-100' : 'scale-x-0'
              }`}
            />
            <span className="relative">
              <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              {showBadge && (
                <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-400 px-1 font-display text-[10px] leading-none text-brand-950">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </span>
            <span className="font-display text-[11px] uppercase leading-none tracking-[0.16em]">
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
