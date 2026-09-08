'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { RotateCcw, X } from 'lucide-react'
import { BeanMark } from '@/components/brand/bean-mark'
import { setCart } from '@/lib/cafe/cart-store'
import { useStoredFlag } from '@/lib/ui/use-stored-flag'
import { useIsHydrated } from '@/lib/ui/use-is-hydrated'
import type { OrderItemPreview } from '@/lib/types'

const DISMISS_KEY = 'sherpa-buy-again-dismissed'

function formatPrice(amount: number) {
  return `Rs. ${amount.toLocaleString('en-IN')}`
}

function ItemThumb({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <span className="arch-sm flex h-11 w-9 shrink-0 items-center justify-center border-2 border-white bg-cream-200">
        <BeanMark className="h-4.5 w-auto text-brand-900/30" />
      </span>
    )
  }
  // Fixed 36×44 thumbnail — see the note in order-history-list.
  return (
    <Image
      src={src}
      alt={alt}
      width={36}
      height={44}
      className="arch-sm h-11 w-9 shrink-0 border-2 border-white object-cover"
    />
  )
}

export function RepeatLastOrderCard({
  shortId,
  total,
  items,
  dismissible = true,
  showHeader = true,
}: {
  shortId: string
  total: number
  items: OrderItemPreview[]
  /** Non-dismissible instances (e.g. profile page) always show and skip the
   *  localStorage check entirely — dismissal is only ever offered on the
   *  landing page, and shouldn't hide the card elsewhere too since both
   *  read/write the same key for the same order id. */
  dismissible?: boolean
  /** Set false when the caller already renders its own section heading
   *  directly above this card (e.g. profile page's "Recent Order") — avoids
   *  two stacked section labels. */
  showHeader?: boolean
}) {
  const router = useRouter()
  const hydrated = useIsHydrated()
  const storedDismissal = useStoredFlag(DISMISS_KEY)
  // Tracked separately so dismissing takes effect immediately — writing the
  // key doesn't notify this tab's own reader.
  const [dismissedNow, setDismissedNow] = useState(false)

  // Hidden until the cart flag has actually been read on the client — avoids
  // a flash of a card the café already dismissed.
  const dismissed = dismissible && (!hydrated || dismissedNow || storedDismissal === shortId)

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, shortId)
    } catch {}
    setDismissedNow(true)
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
    setCart(qty)
    router.push('/orders')
  }

  if (dismissed) return null

  return (
    <div className={showHeader ? 'mx-auto max-w-6xl px-4 pt-6 sm:px-6' : ''}>
      {showHeader && <h2 className="eyebrow mb-2.5">Buy Again</h2>}

      <div className="flex items-center gap-3.5 rounded-xl border border-cream-300 border-l-4 border-l-brand-400 bg-white p-4">
        <div className="flex shrink-0 -space-x-2.5">
          {preview.map(item => (
            <ItemThumb key={item.product_id} src={item.image_url} alt={item.name} />
          ))}
          {extraCount > 0 && (
            <span className="arch-sm flex h-11 w-9 shrink-0 items-center justify-center border-2 border-white bg-cream-200 font-display text-xs text-brand-900">
              +{extraCount}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-display text-base leading-none text-brand-900">
            <RotateCcw className="h-3.5 w-3.5 text-brand-600" />
            Buy Again
          </p>
          <p className="mt-2 truncate text-xs text-gray-500">
            {namesLabel} · {formatPrice(total)}
          </p>
          <p className="mt-1 text-[11px] text-gray-400">Order #{shortId}</p>
        </div>

        <button onClick={handleRepeat} className="btn btn-secondary btn-sm shrink-0">
          Repeat
        </button>

        {dismissible && (
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="shrink-0 text-cream-400 transition-colors hover:text-brand-900"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
