'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CAFE_NAV_ITEMS } from '@/lib/cafe/nav-items'

export function CafeHeader({ cafeName }: { cafeName?: string }) {
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
    const interval = setInterval(readCart, 500)
    return () => { window.removeEventListener('storage', readCart); clearInterval(interval) }
  }, [])

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between">
      <div>
        <h1 className="text-sm font-bold text-amber-900">☕ Sherpa Sips</h1>
        {cafeName && <p className="text-[10px] text-gray-400 leading-tight">{cafeName}</p>}
      </div>

      {/* Desktop nav — hidden on mobile, shown sm+ */}
      <nav className="hidden sm:flex items-center gap-0.5">
        {CAFE_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          const showBadge = href === '/orders' && cartCount > 0
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors relative ${
                active
                  ? 'text-amber-600 bg-amber-50'
                  : 'text-gray-300 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="relative">
                <Icon className="w-4 h-4" strokeWidth={active ? 2.5 : 1.5} />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 bg-amber-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </div>
              {label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
