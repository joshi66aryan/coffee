'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { ORDER_STATUSES } from '@/lib/admin/order-queue'
import type { OrderStatus } from '@/lib/types'

const STATUS_LABEL: Record<OrderStatus, string> = {
  received: 'Received',
  confirmed: 'Confirmed',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
}

export function OrderFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const status = searchParams.get('status') ?? ''
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const hasFilters = Boolean(status || from || to)

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('status')
    params.delete('from')
    params.delete('to')
    params.set('page', '1')
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <select
        aria-label="Filter by status"
        value={status}
        onChange={e => updateParam('status', e.target.value)}
        disabled={isPending}
        className="field w-auto py-2! text-sm!"
      >
        <option value="">All statuses</option>
        {ORDER_STATUSES.map(s => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2">
        <span className="eyebrow-sm text-gray-400">From</span>
        <input
          aria-label="From date"
          type="date"
          value={from}
          onChange={e => updateParam('from', e.target.value)}
          disabled={isPending}
          className="field w-auto py-2! text-sm!"
        />
      </label>

      <label className="flex items-center gap-2">
        <span className="eyebrow-sm text-gray-400">To</span>
        <input
          aria-label="To date"
          type="date"
          value={to}
          onChange={e => updateParam('to', e.target.value)}
          disabled={isPending}
          className="field w-auto py-2! text-sm!"
        />
      </label>

      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          disabled={isPending}
          className="btn btn-ghost btn-sm"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
