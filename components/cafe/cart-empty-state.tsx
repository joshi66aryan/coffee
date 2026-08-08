'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'

export function CartEmptyState() {
  const [hasCart, setHasCart] = useState(true) // true until we know otherwise (avoids flash)

  useEffect(() => {
    function readCart() {
      try {
        const stored = localStorage.getItem('sherpa-cart')
        const qty: Record<string, number> = stored ? JSON.parse(stored) : {}
        const count = Object.values(qty).reduce((sum, n) => sum + n, 0)
        setHasCart(count > 0)
      } catch {
        setHasCart(false)
      }
    }
    readCart()
    window.addEventListener('storage', readCart)
    // Poll every 500ms to catch same-tab updates (e.g. CartSection removing the last item)
    const interval = setInterval(readCart, 500)
    return () => { window.removeEventListener('storage', readCart); clearInterval(interval) }
  }, [])

  if (hasCart) return null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <ShoppingCart className="w-7 h-7 text-gray-300" />
      </div>
      <p className="font-semibold text-gray-700">Your cart is empty</p>
      <p className="text-sm text-gray-400 mt-1">Add items from the Home tab to place an order.</p>
      <Link
        href="/"
        className="mt-5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
      >
        Browse Catalog
      </Link>
    </div>
  )
}
