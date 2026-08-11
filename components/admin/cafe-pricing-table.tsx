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
    <tr>
      <td className="font-display text-base text-brand-900">{row.name}</td>
      <td className="eyebrow-sm capitalize text-gray-400">{row.category}</td>
      <td className="text-gray-600 tabular-nums">{formatPrice(row.base_price)}</td>
      <td>
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
            className="field w-24 px-2.5! py-1.5! text-sm!"
          />
          {isPending && <span className="eyebrow-sm text-gray-400">Saving…</span>}
          {saved && !isPending && <span className="eyebrow-sm text-olive-500">Saved</span>}
          {error && <span className="text-xs text-red-700">{error}</span>}
        </div>
      </td>
      <td className="font-display text-base text-brand-900 tabular-nums">
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
    return (
      <div className="px-5 py-14 text-center">
        <p className="display-sm text-brand-900">No products yet</p>
        <p className="mt-2 text-sm text-gray-500">Add products to the catalog to set café pricing.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="table-brand min-w-150">
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Base Price</th>
            <th>Custom Price</th>
            <th>Effective</th>
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
