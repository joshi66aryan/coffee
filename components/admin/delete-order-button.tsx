'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteOrder } from '@/lib/admin/actions'

export function DeleteOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleDelete() {
    if (!confirm('Delete this order? This permanently removes the order, its items, and its invoice. This cannot be undone.')) return
    setError('')
    startTransition(async () => {
      const result = await deleteOrder(orderId)
      if (result.error) {
        setError(result.error)
        return
      }
      router.push('/admin/orders')
      router.refresh()
    })
  }

  return (
    <div>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="font-display text-sm uppercase tracking-[0.12em] text-red-700 transition-colors hover:text-red-900 disabled:opacity-50"
      >
        {isPending ? 'Deleting…' : 'Delete Order'}
      </button>
      {error && (
        <p role="alert" className="mt-3 border-l-2 border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
