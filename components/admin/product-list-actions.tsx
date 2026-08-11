'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteProduct, updateStockStatus } from '@/lib/admin/actions'
import type { StockStatus } from '@/lib/types'

const NEXT_STATUS: Record<StockStatus, StockStatus> = {
  in_stock: 'low',
  low: 'out_of_stock',
  out_of_stock: 'in_stock',
}

const STOCK_LABEL: Record<StockStatus, string> = {
  in_stock: 'In Stock',
  low: 'Low',
  out_of_stock: 'Out of Stock',
}

const STOCK_CLASS: Record<StockStatus, string> = {
  in_stock: 'bg-olive-600 text-cream-100',
  low: 'bg-brand-400 text-brand-950',
  out_of_stock: 'bg-cream-300 text-brand-900',
}

export function StockToggle({ id, status }: { id: string; status: StockStatus }) {
  const [isPending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      await updateStockStatus(id, NEXT_STATUS[status])
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      title="Click to cycle stock status"
      className={`pill cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50 ${STOCK_CLASS[status]}`}
    >
      {isPending ? '…' : STOCK_LABEL[status]}
    </button>
  )
}

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteProduct(id)
      if (result.error) {
        alert(`Failed to delete: ${result.error}`)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="font-display text-sm uppercase tracking-[0.12em] text-red-700 transition-colors hover:text-red-900 disabled:opacity-50"
    >
      {isPending ? 'Deleting…' : 'Delete'}
    </button>
  )
}
