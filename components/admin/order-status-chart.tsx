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

// Ordinal ramp (light -> dark) tracking the received -> delivered stage
// sequence, not an arbitrary categorical assignment. Climbs the brand palette
// from cream foothills to the olive summit, matching the order queue badges.
const STATUS_BAR_CLASS: Record<OrderStatus, string> = {
  received: 'bg-cream-300',
  confirmed: 'bg-brand-400',
  out_for_delivery: 'bg-brand-600',
  delivered: 'bg-olive-600',
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
              <span className="mb-1.5 font-display text-lg leading-none text-brand-900 tabular-nums">
                {count}
              </span>
              <div
                className={`w-full max-w-12 rounded-t-sm transition-opacity ${
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
          <span key={status} className="eyebrow-sm flex-1 text-center leading-tight text-gray-400">
            {STATUS_LABEL[status]}
          </span>
        ))}
      </div>
    </div>
  )
}
