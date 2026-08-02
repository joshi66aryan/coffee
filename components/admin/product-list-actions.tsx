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
  in_stock: 'bg-green-100 text-green-800',
  low: 'bg-yellow-100 text-yellow-800',
  out_of_stock: 'bg-red-100 text-red-800',
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
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium cursor-pointer disabled:opacity-50 transition-opacity ${STOCK_CLASS[status]}`}
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
      className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
    >
      {isPending ? 'Deleting…' : 'Delete'}
    </button>
  )
}
