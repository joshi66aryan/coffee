'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBasket, Loader2 } from 'lucide-react'
import { getCartProducts } from '@/lib/cafe/catalog-actions'
import { placeOrder } from '@/lib/cafe/order-actions'
import type { CatalogProduct, PaymentType } from '@/lib/types'

function formatPrice(n: number) {
  return `Rs. ${n.toLocaleString('en-IN')}`
}

export function CartSection({ creditEnabled }: { creditEnabled: boolean }) {
  const router = useRouter()
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [paymentType, setPaymentType] = useState<PaymentType>('cash')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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

  if (loading) return null
  if (activeItems.length === 0) return null

  function handlePlace() {
    setError(null)
    startTransition(async () => {
      const result = await placeOrder({
        items: activeItems.map(p => ({ product_id: p.id, quantity: quantities[p.id] })),
        payment_type: paymentType,
      })
      if ('error' in result) { setError(result.error); return }
      try { localStorage.removeItem('sherpa-cart') } catch {}
      router.push(`/order/confirm?orderId=${result.orderId}`)
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Cart header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <ShoppingBasket className="w-4 h-4 text-amber-600" />
        <h2 className="text-sm font-bold text-gray-900">Cart</h2>
        <span className="ml-auto text-xs text-gray-400">
          {activeItems.length} item{activeItems.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-100">
        {activeItems.map(product => {
          const qty = quantities[product.id] ?? 0
          return (
            <div key={product.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                <p className="text-xs text-gray-400">{formatPrice(product.effective_price)} / {product.unit}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setQty(product.id, qty - 1)}
                  className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold text-base flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all leading-none"
                >
                  −
                </button>
                <span className="w-5 text-center text-sm font-bold tabular-nums">{qty}</span>
                <button
                  onClick={() => setQty(product.id, qty + 1)}
                  className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold text-base flex items-center justify-center hover:bg-amber-200 active:scale-95 transition-all leading-none"
                >
                  +
                </button>
              </div>
              <p className="text-sm font-bold text-gray-900 w-16 text-right shrink-0">
                {formatPrice(product.effective_price * qty)}
              </p>
            </div>
          )
        })}
      </div>

      {/* Payment + CTA */}
      <div className="px-4 py-3 space-y-3">
        <div className="flex gap-2">
          {(['cash', 'credit'] as PaymentType[]).map(type => (
            <button
              key={type}
              onClick={() => type === 'credit' && !creditEnabled ? undefined : setPaymentType(type)}
              disabled={type === 'credit' && !creditEnabled}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all capitalize ${
                paymentType === type
                  ? 'bg-amber-600 border-amber-600 text-white'
                  : type === 'credit' && !creditEnabled
                  ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                  : 'border-gray-200 text-gray-600 hover:border-amber-300'
              }`}
            >
              {type === 'cash' ? '💵' : '📋'} {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center pt-1 border-t border-gray-100">
          <span className="font-bold text-gray-900">Total</span>
          <span className="font-bold text-amber-900 text-lg">{formatPrice(total)}</span>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
        )}

        <button
          onClick={handlePlace}
          disabled={isPending}
          className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl py-3.5 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Placing Order…
            </>
          ) : (
            `Place Order · ${formatPrice(total)}`
          )}
        </button>
      </div>
    </div>
  )
}
