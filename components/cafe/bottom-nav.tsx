'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ShoppingBasket, ClipboardList, User } from 'lucide-react'

const SHOW_ON = ['/', '/orders', '/profile']

const NAV_ITEMS = [
  { href: '/', label: 'Shop', icon: ShoppingBasket },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
  { href: '/profile', label: 'Profile', icon: User },
]

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
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 flex h-16">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        const showBadge = href === '/orders' && cartCount > 0

        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors ${
              active ? 'text-amber-600' : 'text-gray-300 hover:text-gray-500'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.5} />
              {showBadge && (
                <span className="absolute -top-1.5 -right-2 min-w-4 h-4 bg-amber-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
