'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setCafeProductPrice } from '@/lib/admin/actions'
import { parsePriceInput, resolveEffectivePrice } from '@/lib/admin/cafe-pricing'
import type { CafeProductPricingRow } from '@/lib/types'

function formatPrice(amount: number) {
  return `Rs. ${amount.toLocaleString('en-IN')}`
}

function PriceRow({ cafeId, row }: { cafeId: string; row: CafeProductPricingRow }) {
  const router = useRouter()
  const [value, setValue] = useState(row.custom_price != null ? String(row.custom_price) : '')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function commit(raw: string) {
    setError('')
    setSaved(false)

    const parsed = parsePriceInput(raw)
    if (parsed === undefined) {
      setError('Enter a valid price')
      return
    }
    if (parsed === row.custom_price) return

    startTransition(async () => {
      const result = await setCafeProductPrice(cafeId, row.product_id, parsed)
      if (result.error) {
        setError(result.error)
        return
      }
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-3 pr-4 text-sm font-medium text-gray-900">{row.name}</td>
      <td className="py-3 pr-4 text-xs text-gray-400">{row.category}</td>
      <td className="py-3 pr-4 text-sm text-gray-600 tabular-nums">{formatPrice(row.base_price)}</td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <input
            aria-label={`Custom price for ${row.name}`}
            type="number"
            min="0"
            step="0.01"
            value={value}
            placeholder={String(row.base_price)}
            onChange={e => {
              setValue(e.target.value)
              setSaved(false)
            }}
            onBlur={e => commit(e.target.value)}
            disabled={isPending}
            className="w-24 px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
          />
          {isPending && <span className="text-xs text-gray-400">Saving…</span>}
          {saved && !isPending && <span className="text-xs text-emerald-600">Saved</span>}
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </td>
      <td className="py-3 text-sm font-semibold text-gray-900 tabular-nums">
        {formatPrice(resolveEffectivePrice(row.base_price, row.custom_price))}
      </td>
    </tr>
  )
}

export function CafePricingTable({
  cafeId,
  rows,
}: {
  cafeId: string
  rows: CafeProductPricingRow[]
}) {
  if (rows.length === 0) {
    return <div className="py-10 text-center text-gray-500">No products in the catalog yet.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-150">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Product</th>
            <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Category</th>
            <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Base Price</th>
            <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Custom Price</th>
            <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Effective</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <PriceRow key={row.product_id} cafeId={cafeId} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
