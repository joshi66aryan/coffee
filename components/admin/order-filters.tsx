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
    <div className="flex items-center gap-3 mb-4 flex-wrap">
      <select
        aria-label="Filter by status"
        value={status}
        onChange={e => updateParam('status', e.target.value)}
        disabled={isPending}
        className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
      >
        <option value="">All statuses</option>
        {ORDER_STATUSES.map(s => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-1.5 text-sm text-gray-500">
        From
        <input
          aria-label="From date"
          type="date"
          value={from}
          onChange={e => updateParam('from', e.target.value)}
          disabled={isPending}
          className="px-2 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
        />
      </label>

      <label className="flex items-center gap-1.5 text-sm text-gray-500">
        To
        <input
          aria-label="To date"
          type="date"
          value={to}
          onChange={e => updateParam('to', e.target.value)}
          disabled={isPending}
          className="px-2 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
        />
      </label>

      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          disabled={isPending}
          className="text-sm text-amber-700 hover:text-amber-900 font-medium disabled:opacity-50"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
