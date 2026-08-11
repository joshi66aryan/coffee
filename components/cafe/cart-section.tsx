'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, AlertTriangle, Repeat, Minus, Plus, Banknote, FileText } from 'lucide-react'
import { getCartProducts, getSubstituteProducts } from '@/lib/cafe/catalog-actions'
import { placeOrder } from '@/lib/cafe/order-actions'
import { hasOutOfStockItems, isLargeOrder } from '@/lib/cafe/cart'
import type { CatalogProduct, PaymentType } from '@/lib/types'

function formatPrice(n: number) {
  return `Rs. ${n.toLocaleString('en-IN')}`
}

const PAYMENT_OPTIONS: { type: PaymentType; label: string; icon: typeof Banknote }[] = [
  { type: 'cash', label: 'Cash', icon: Banknote },
  { type: 'credit', label: 'Credit', icon: FileText },
]

export function CartSection({
  creditEnabled,
  profileComplete = true,
}: {
  creditEnabled: boolean
  profileComplete?: boolean
}) {
  const router = useRouter()
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [paymentType, setPaymentType] = useState<PaymentType>('cash')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [substitutes, setSubstitutes] = useState<CatalogProduct[]>([])
  const [confirmingLargeOrder, setConfirmingLargeOrder] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sherpa-cart')
      const qty: Record<string, number> = stored ? JSON.parse(stored) : {}
      setQuantities(qty)
      const ids = Object.keys(qty).filter(id => qty[id] > 0)
      if (ids.length === 0) { setLoading(false); return }
      getCartProducts(ids).then(prods => { setProducts(prods); setLoading(false) })
    } catch {
      setLoading(false)
    }
  }, [])

  function persistQty(next: Record<string, number>) {
    setQuantities(next)
    try { localStorage.setItem('sherpa-cart', JSON.stringify(next)) } catch {}
  }

  function setQty(productId: string, qty: number) {
    const next = { ...quantities }
    if (qty <= 0) {
      delete next[productId]
      setProducts(prev => prev.filter(p => p.id !== productId))
    } else {
      next[productId] = qty
    }
    persistQty(next)
  }

  const activeItems = products.filter(p => (quantities[p.id] ?? 0) > 0)
  const total = activeItems.reduce((sum, p) => sum + p.effective_price * (quantities[p.id] ?? 0), 0)
  const outOfStock = hasOutOfStockItems(activeItems)

  const oosCategoryKey = [...new Set(activeItems.filter(p => p.stock_status === 'out_of_stock').map(p => p.category))]
    .sort()
    .join('|')
  const activeIdKey = activeItems.map(p => p.id).sort().join(',')
  const hasSubstitute = activeItems.some(
    p => p.stock_status === 'out_of_stock' && substitutes.some(s => s.category === p.category)
  )

  useEffect(() => {
    if (!oosCategoryKey) return
    let cancelled = false
    getSubstituteProducts(oosCategoryKey.split('|'), activeItems.map(p => p.id)).then(subs => {
      if (!cancelled) setSubstitutes(subs)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oosCategoryKey, activeIdKey])

  function swapItem(oldProductId: string, replacement: CatalogProduct) {
    const carryQty = quantities[oldProductId] ?? 0
    const next = { ...quantities }
    delete next[oldProductId]
    next[replacement.id] = (next[replacement.id] ?? 0) + carryQty
    persistQty(next)
    setProducts(prev => {
      const withoutOld = prev.filter(p => p.id !== oldProductId)
      return withoutOld.some(p => p.id === replacement.id) ? withoutOld : [...withoutOld, replacement]
    })
  }

  if (loading) return null
  if (activeItems.length === 0) return null

  function submitOrder() {
    setError(null)
    setConfirmingLargeOrder(false)
    startTransition(async () => {
      const result = await placeOrder({
        items: activeItems.map(p => ({ product_id: p.id, quantity: quantities[p.id] })),
        payment_type: paymentType,
      })
      if ('error' in result) { setError(result.error); return }
      // Cleared on the confirmation page instead of here — clearing before
      // navigating away lets this page's own empty-cart state flash through
      // for a moment while the new route is still loading.
      router.push(`/order/confirm?orderId=${result.orderId}`)
    })
  }

  function handlePlace() {
    if (outOfStock || !profileComplete) return
    if (isLargeOrder(total)) {
      setConfirmingLargeOrder(true)
      return
    }
    submitOrder()
  }

  return (
    <section className="overflow-hidden rounded-xl border border-cream-300 bg-white">
      {/* ---- Header ------------------------------------------------------ */}
      <header className="flex items-baseline justify-between gap-3 border-b border-cream-300 bg-cream-100 px-4 py-3.5 sm:px-5">
        <h2 className="display-sm text-brand-900">Your Order</h2>
        <span className="eyebrow-sm text-gray-400">
          {activeItems.length} {activeItems.length === 1 ? 'Item' : 'Items'}
        </span>
      </header>

      {/* ---- Warnings ---------------------------------------------------- */}
      {!profileComplete && (
        <div className="flex items-start gap-2.5 border-b border-cream-300 bg-brand-50 px-4 py-3 sm:px-5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          <p className="text-xs leading-relaxed text-brand-800">
            <span className="font-semibold">Add your phone number and delivery address</span> in{' '}
            <Link href="/settings" className="font-semibold underline underline-offset-2">
              Account Settings
            </Link>{' '}
            before placing an order.
          </p>
        </div>
      )}

      {outOfStock && (
        <div className="flex items-start gap-2.5 border-b border-cream-300 bg-red-50 px-4 py-3 sm:px-5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <p className="text-xs leading-relaxed text-red-800">
            <span className="font-semibold">Some items are no longer in stock.</span>{' '}
            {hasSubstitute
              ? 'Swap for a suggested alternative below, remove them, or '
              : 'Remove them to place your order, or '}
            <Link href="/" className="font-semibold underline underline-offset-2">
              browse the catalog
            </Link>{' '}
            for a replacement.
          </p>
        </div>
      )}

      {/* ---- Line items -------------------------------------------------- */}
      <ul className="divide-y divide-cream-200">
        {activeItems.map(product => {
          const qty = quantities[product.id] ?? 0
          const unavailable = product.stock_status === 'out_of_stock'
          const rowSubstitutes = unavailable
            ? substitutes.filter(s => s.category === product.category).slice(0, 3)
            : []

          return (
            <li key={product.id} className="px-4 py-3.5 sm:px-5">
              <div className={`flex items-center gap-3 ${unavailable ? 'opacity-70' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-display text-base leading-none text-brand-900">
                      {product.name}
                    </p>
                    {unavailable && (
                      <span className="pill shrink-0 bg-red-100 text-red-800">Out of Stock</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">
                    {formatPrice(product.effective_price)} / {product.unit}
                  </p>
                </div>

                {unavailable ? (
                  <button onClick={() => setQty(product.id, 0)} className="btn btn-outline btn-sm shrink-0">
                    Remove
                  </button>
                ) : (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setQty(product.id, qty - 1)}
                      className="step-btn"
                      aria-label={`Decrease ${product.name}`}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center font-display text-base tabular-nums text-brand-900">
                      {qty}
                    </span>
                    <button
                      onClick={() => setQty(product.id, qty + 1)}
                      className="step-btn step-btn-solid"
                      aria-label={`Increase ${product.name}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <p className="w-20 shrink-0 text-right font-display text-base text-brand-900 tabular-nums">
                  {formatPrice(product.effective_price * qty)}
                </p>
              </div>

              {unavailable && rowSubstitutes.length > 0 && (
                <div className="scrollbar-hide mt-2.5 flex items-center gap-2 overflow-x-auto">
                  <span className="eyebrow-sm flex shrink-0 items-center gap-1.5 text-gray-400">
                    <Repeat className="h-3 w-3" />
                    Swap
                  </span>
                  {rowSubstitutes.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => swapItem(product.id, sub)}
                      className="chip shrink-0"
                    >
                      {sub.name} · {formatPrice(sub.effective_price)}
                    </button>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {/* ---- Payment + total --------------------------------------------- */}
      <div className="space-y-4 border-t border-cream-300 bg-cream-100 px-4 py-4 sm:px-5">
        <div>
          <p className="field-label">Payment method</p>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_OPTIONS.map(({ type, label, icon: Icon }) => {
              const disabled = type === 'credit' && !creditEnabled
              const selected = paymentType === type
              return (
                <button
                  key={type}
                  onClick={() => !disabled && setPaymentType(type)}
                  disabled={disabled}
                  aria-pressed={selected}
                  className={`flex items-center justify-center gap-2 rounded-lg border py-3 font-display text-sm uppercase tracking-[0.12em] transition-all ${
                    selected
                      ? 'border-brand-900 bg-brand-900 text-cream-50'
                      : disabled
                      ? 'cursor-not-allowed border-cream-300 text-cream-400'
                      : 'border-cream-300 text-gray-600 hover:border-brand-600 hover:text-brand-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              )
            })}
          </div>
          {!creditEnabled && (
            <p className="mt-2 text-[11px] text-gray-400">
              Credit terms are enabled by Sherpa Sips once your account qualifies.
            </p>
          )}
        </div>

        <div className="flex items-baseline justify-between border-t border-cream-300 pt-3.5">
          <span className="eyebrow text-gray-500">Order total</span>
          <span className="font-display text-3xl leading-none text-brand-900 tabular-nums">
            <span className="text-[0.5em] text-brand-600">Rs.</span>{' '}
            {total.toLocaleString('en-IN')}
          </span>
        </div>

        {error && (
          <p role="alert" className="border-l-2 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {confirmingLargeOrder && isLargeOrder(total) ? (
          <div className="space-y-3 rounded-lg border border-brand-300 bg-brand-50 px-3.5 py-3.5">
            <p className="text-xs leading-relaxed text-brand-800">
              <span className="font-semibold">This is a large order — {formatPrice(total)}.</span>{' '}
              Please confirm the quantities are correct before placing it.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingLargeOrder(false)}
                className="btn btn-outline btn-sm flex-1"
              >
                Review Cart
              </button>
              <button
                onClick={submitOrder}
                disabled={isPending}
                className="btn btn-primary btn-sm flex-1"
              >
                {isPending ? 'Placing Order…' : 'Confirm & Place Order'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handlePlace}
            disabled={isPending || outOfStock || !profileComplete}
            className="btn btn-primary btn-block btn-lg"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Placing Order…
              </>
            ) : outOfStock ? (
              'Remove unavailable items to continue'
            ) : !profileComplete ? (
              'Complete your profile to continue'
            ) : (
              `Place Order · ${formatPrice(total)}`
            )}
          </button>
        )}
      </div>
    </section>
  )
}
