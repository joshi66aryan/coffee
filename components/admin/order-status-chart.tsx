'use client'

import { useState } from 'react'
import type { StatusCount } from '@/lib/admin/dashboard'
import type { OrderStatus } from '@/lib/types'

const STATUS_LABEL: Record<OrderStatus, string> = {
  received: 'Received',
  confirmed: 'Confirmed',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
}

// Ordinal ramp (light -> dark) tracking the received -> delivered stage sequence,
// not an arbitrary categorical assignment.
const STATUS_BAR_CLASS: Record<OrderStatus, string> = {
  received: 'bg-[#86b6ef]',
  confirmed: 'bg-[#6da7ec]',
  out_for_delivery: 'bg-[#2a78d6]',
  delivered: 'bg-[#1c5cab]',
}

const CHART_HEIGHT = 160

export function OrderStatusChart({ counts }: { counts: StatusCount[] }) {
  const [hovered, setHovered] = useState<OrderStatus | null>(null)

  if (counts.every(c => c.count === 0)) {
    return <div className="py-10 text-center text-gray-500">No orders yet.</div>
  }

  const max = Math.max(1, ...counts.map(c => c.count))

  return (
    <div role="img" aria-label="Orders by status">
      <div className="flex items-end justify-between gap-4" style={{ height: CHART_HEIGHT }}>
        {counts.map(({ status, count }) => {
          const heightPct = (count / max) * 100
          return (
            <div
              key={status}
              className="flex-1 flex flex-col items-center justify-end h-full"
              onPointerEnter={() => setHovered(status)}
              onPointerLeave={() => setHovered(null)}
            >
              <span className="text-sm font-semibold text-gray-900 tabular-nums mb-1">{count}</span>
              <div
                className={`w-full max-w-12 rounded-t-[4px] transition-opacity ${
                  hovered === status ? 'opacity-80' : ''
                } ${STATUS_BAR_CLASS[status]}`}
                style={{ height: `${Math.max(heightPct, 3)}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex items-start justify-between gap-4 mt-2">
        {counts.map(({ status }) => (
          <span key={status} className="flex-1 text-center text-xs text-gray-400 leading-tight">
            {STATUS_LABEL[status]}
          </span>
        ))}
      </div>
    </div>
  )
}
