'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CAFE_NAV_ITEMS } from '@/lib/cafe/nav-items'
import { SherpaSipsLogo } from '@/components/cafe/sherpa-sips-logo'

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
    <header className="sticky top-0 z-20 bg-brand-900 text-cream-200">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <SherpaSipsLogo variant="horizontal" tone="mono" className="h-8 text-cream-50" />
          {cafeName && (
            <>
              <span className="hidden h-6 w-px shrink-0 bg-cream-200/25 sm:block" />
              <span className="eyebrow-sm hidden min-w-0 truncate text-cream-200/70 sm:block">
                {cafeName}
              </span>
            </>
          )}
        </Link>

        {/* Desktop nav — mobile uses BottomNav instead. */}
        <nav className="hidden items-center gap-1 sm:flex">
          {CAFE_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            const showBadge = href === '/orders' && cartCount > 0
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex items-center gap-2 px-3 py-2 font-display text-sm uppercase tracking-[0.14em] transition-colors ${
                  active ? 'text-brand-400' : 'text-cream-200/65 hover:text-cream-50'
                }`}
              >
                <span className="relative">
                  <Icon className="h-4 w-4" strokeWidth={active ? 2.25 : 1.75} />
                  {showBadge && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-400 px-1 font-display text-[10px] leading-none text-brand-950">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </span>
                {label}
                {/* Active marker sits on the baseline like a printed rule. */}
                <span
                  className={`absolute inset-x-2 -bottom-px h-0.5 origin-left bg-brand-400 transition-transform duration-200 ${
                    active ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Golden hairline — the brand's "trail" line closing the header. */}
      <div className="h-px w-full bg-linear-to-r from-brand-400 via-brand-600 to-olive-600" />
    </header>
  )
}
