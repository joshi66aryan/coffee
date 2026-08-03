'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ClipboardList } from 'lucide-react'

export function OrdersEmptyState() {
  const [hasCart, setHasCart] = useState(true) // true until we know otherwise (avoids flash)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sherpa-cart')
      const qty: Record<string, number> = stored ? JSON.parse(stored) : {}
      const count = Object.values(qty).reduce((sum, n) => sum + n, 0)
      setHasCart(count > 0)
    } catch {
      setHasCart(false)
    }
  }, [])

  if (hasCart) return null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <ClipboardList className="w-7 h-7 text-gray-300" />
      </div>
      <p className="font-semibold text-gray-700">No orders yet</p>
      <p className="text-sm text-gray-400 mt-1">Add items from the Shop tab to place your first order.</p>
      <Link
        href="/"
        className="mt-5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
      >
        Browse Catalog
      </Link>
    </div>
  )
}
