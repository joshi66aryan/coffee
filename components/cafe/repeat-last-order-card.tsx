'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, X } from 'lucide-react'
import type { OrderItemPreview } from '@/lib/types'

const DISMISS_KEY = 'sherpa-buy-again-dismissed'

function formatPrice(amount: number) {
  return `Rs. ${amount.toLocaleString('en-IN')}`
}

function ItemThumb({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <span className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-sm shrink-0 border-2 border-white">
        ☕
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="w-8 h-8 rounded-lg object-cover shrink-0 border-2 border-white"
    />
  )
}

export function RepeatLastOrderCard({
  shortId,
  total,
  items,
}: {
  shortId: string
  total: number
  items: OrderItemPreview[]
}) {
  const router = useRouter()
  // Hidden until the mount check confirms it wasn't already dismissed —
  // avoids a flash of the card before localStorage can be read.
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === shortId)
    } catch {
      setDismissed(false)
    }
  }, [shortId])

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, shortId)
    } catch {}
    setDismissed(true)
  }

  const preview = items.slice(0, 3)
  const extraCount = items.length - preview.length
  const namesLabel =
    items.length <= 2
      ? items.map(i => i.name).join(', ')
      : `${items[0].name} +${items.length - 1} more`

  function handleRepeat() {
    const qty: Record<string, number> = {}
    items.forEach(item => {
      qty[item.product_id] = item.quantity
    })
    try {
      localStorage.setItem('sherpa-cart', JSON.stringify(qty))
    } catch {}
    router.push('/orders')
  }

  if (dismissed) return null

  return (
    <div className="px-3 pt-3">
      <h2 className="px-1 pb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Buy Again</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-4 flex items-center gap-3">
        <div className="flex -space-x-2 shrink-0">
          {preview.map(item => (
            <ItemThumb key={item.product_id} src={item.image_url} alt={item.name} />
          ))}
          {extraCount > 0 && (
            <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-500 shrink-0 border-2 border-white">
              +{extraCount}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
            Buy Again
          </p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {namesLabel} · {formatPrice(total)}
          </p>
          <p className="text-xs text-gray-300">Order #{shortId}</p>
        </div>
        <button
          onClick={handleRepeat}
          className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors active:scale-95"
        >
          Repeat
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
