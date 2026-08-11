'use client'

import { useState } from 'react'
import type { TopProduct } from '@/lib/admin/dashboard'

function formatPrice(amount: number) {
  return `Rs. ${amount.toLocaleString('en-IN')}`
}

export function TopProductsChart({ products }: { products: TopProduct[] }) {
  const [hovered, setHovered] = useState<string | null>(null)

  if (products.length === 0) {
    return <div className="py-10 text-center text-gray-500">No orders yet.</div>
  }

  const max = Math.max(...products.map(p => p.quantitySold))

  return (
    <div className="space-y-3" role="img" aria-label="Top selling products by units sold">
      {products.map(product => {
        const widthPct = max === 0 ? 0 : Math.max((product.quantitySold / max) * 100, 4)
        const isHovered = hovered === product.product_id

        return (
          <div
            key={product.product_id}
            className="flex items-center gap-3"
            onPointerEnter={() => setHovered(product.product_id)}
            onPointerLeave={() => setHovered(null)}
          >
            <span className="w-28 shrink-0 truncate font-display text-sm text-brand-900" title={product.name}>
              {product.name}
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div
                className={`h-6 rounded-r-sm bg-brand-600 transition-opacity ${isHovered ? 'opacity-80' : ''}`}
                style={{ width: `${widthPct}%` }}
              />
              <span className="whitespace-nowrap font-display text-sm text-brand-900 tabular-nums">
                {product.quantitySold} units
              </span>
              {isHovered && (
                <span className="text-xs text-gray-400 whitespace-nowrap">{formatPrice(product.revenue)}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
