'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrderStatus } from '@/lib/admin/actions'
import { ORDER_STATUS_LABELS, ORDER_STATUS_STEPS } from '@/lib/cafe/order-status'
import type { OrderStatus } from '@/lib/types'

export function OrderStatusActions({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleSetStatus(next: OrderStatus) {
    if (next === status) return
    setError('')
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, next)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {ORDER_STATUS_STEPS.map(step => {
          const isCurrent = step === status
          return (
            <button
              key={step}
              onClick={() => handleSetStatus(step)}
              disabled={isPending || isCurrent}
              aria-pressed={isCurrent}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 ${
                isCurrent
                  ? 'bg-amber-600 border-amber-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {ORDER_STATUS_LABELS[step]}
            </button>
          )
        })}
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
