'use client'

import { useRef, useState, type PointerEvent } from 'react'
import type { DailySales } from '@/lib/admin/dashboard'

const WIDTH = 720
const HEIGHT = 240
const PADDING = { top: 16, right: 12, bottom: 28, left: 48 }
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom

function niceMax(value: number): number {
  if (value <= 0) return 100
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  const normalized = value / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

function formatPrice(amount: number) {
  return `Rs. ${Math.round(amount).toLocaleString('en-IN')}`
}

function formatAxisPrice(amount: number) {
  return amount >= 1000 ? `${Math.round(amount / 1000)}k` : String(Math.round(amount))
}

function formatDateLabel(dateStr: string) {
  return new Date(`${dateStr}T00:00:00.000Z`).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

export function SalesTrendChart({ data }: { data: DailySales[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  if (data.length === 0) {
    return <div className="py-10 text-center text-gray-500">No orders yet.</div>
  }

  const lastIndex = data.length - 1
  const max = niceMax(Math.max(...data.map(d => d.total)))

  function xAt(i: number) {
    return PADDING.left + (lastIndex === 0 ? 0 : (i / lastIndex) * PLOT_WIDTH)
  }
  function yAt(total: number) {
    return PADDING.top + PLOT_HEIGHT - (max === 0 ? 0 : (total / max) * PLOT_HEIGHT)
  }

  const linePoints = data.map((d, i) => `${xAt(i)},${yAt(d.total)}`).join(' ')
  const baselineY = PADDING.top + PLOT_HEIGHT
  const areaPoints = `${PADDING.left},${baselineY} ${linePoints} ${xAt(lastIndex)},${baselineY}`

  const gridTicks = [0, max / 2, max]

  // ~6 evenly spaced date labels, always including the last day
  const labelStep = Math.max(1, Math.round(lastIndex / 5))
  const labelIndices = data.map((_, i) => i).filter(i => i % labelStep === 0 || i === lastIndex)

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const fraction = (e.clientX - rect.left) / rect.width
    const index = Math.min(lastIndex, Math.max(0, Math.round(fraction * lastIndex)))
    setHoverIndex(index)
  }

  const hovered = hoverIndex !== null ? data[hoverIndex] : null
  const tooltipLeftPct = hoverIndex !== null ? (xAt(hoverIndex) / WIDTH) * 100 : 0

  return (
    <div>
      <div
        ref={containerRef}
        className="relative touch-none"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Daily sales trend for the last ${data.length} days`}
        >
          {gridTicks.map(tick => (
            <g key={tick}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={yAt(tick)}
                y2={yAt(tick)}
                className="stroke-[#e1e0d9]"
                strokeWidth={1}
              />
              <text
                x={PADDING.left - 8}
                y={yAt(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-[#898781] text-[10px] tabular-nums"
              >
                {formatAxisPrice(tick)}
              </text>
            </g>
          ))}

          {labelIndices.map(i => (
            <text key={i} x={xAt(i)} y={HEIGHT - 8} textAnchor="middle" className="fill-[#898781] text-[10px]">
              {formatDateLabel(data[i].date)}
            </text>
          ))}

          <polygon points={areaPoints} className="fill-[#2a78d6] opacity-10" />
          <polyline
            points={linePoints}
            fill="none"
            className="stroke-[#2a78d6]"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {hoverIndex !== null && (
            <>
              <line
                x1={xAt(hoverIndex)}
                x2={xAt(hoverIndex)}
                y1={PADDING.top}
                y2={baselineY}
                className="stroke-[#c3c2b7]"
                strokeWidth={1}
              />
              <circle
                cx={xAt(hoverIndex)}
                cy={yAt(data[hoverIndex].total)}
                r={4}
                className="fill-[#2a78d6] stroke-white"
                strokeWidth={2}
              />
            </>
          )}
        </svg>

        {hovered && (
          <div
            className="absolute top-2 -translate-x-1/2 pointer-events-none bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg"
            style={{ left: `${tooltipLeftPct}%` }}
          >
            <p className="font-semibold">{formatPrice(hovered.total)}</p>
            <p className="text-gray-300">{formatDateLabel(hovered.date)}</p>
          </div>
        )}
      </div>

      <details className="mt-2">
        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
          View as table
        </summary>
        <div className="mt-2 max-h-48 overflow-y-auto border border-gray-100 rounded-lg">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="text-left py-1.5 px-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Date
                </th>
                <th className="text-right py-1.5 px-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Sales
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map(d => (
                <tr key={d.date} className="border-t border-gray-100">
                  <td className="py-1.5 px-3 text-gray-600">{formatDateLabel(d.date)}</td>
                  <td className="py-1.5 px-3 text-right text-gray-900 tabular-nums">{formatPrice(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
