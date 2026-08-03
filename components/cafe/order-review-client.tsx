'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { placeOrder } from '@/lib/cafe/order-actions'
import type { PaymentType } from '@/lib/types'

export interface ReviewItem {
  product_id: string
  name: string
  unit: string
  quantity: number
  unit_price: number
  stock_status: string
}

function formatPrice(amount: number) {
  return `Rs. ${amount.toLocaleString('en-IN')}`
}

export function OrderReviewClient({
  initialItems,
  creditEnabled,
}: {
  initialItems: ReviewItem[]
  creditEnabled: boolean
}) {
  const router = useRouter()
  const [items, setItems] = useState<ReviewItem[]>(initialItems)
  const [paymentType, setPaymentType] = useState<PaymentType>('cash')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const activeItems = items.filter(i => i.quantity > 0)
  const total = activeItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)

  function setQty(productId: string, qty: number) {
    if (qty <= 0) {
      setItems(prev => prev.filter(i => i.product_id !== productId))
    } else {
      setItems(prev =>
        prev.map(i => (i.product_id === productId ? { ...i, quantity: qty } : i))
      )
    }
  }

  function handleConfirm() {
    if (activeItems.length === 0) return
    setError(null)
    startTransition(async () => {
      const result = await placeOrder({
        items: activeItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        payment_type: paymentType,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      router.push(`/order/confirm?orderId=${result.orderId}`)
    })
  }

  return (
    <div className="max-w-sm mx-auto px-4 pt-4 pb-10 space-y-3">
      {/* Items */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Your Items</h2>
          <span className="text-xs text-gray-400">{activeItems.length} product{activeItems.length !== 1 ? 's' : ''}</span>
        </div>

        {activeItems.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-gray-400 text-sm">All items removed.</p>
            <button
              onClick={() => router.push('/catalog')}
              className="mt-3 text-amber-600 text-sm font-medium hover:underline"
            >
              Back to catalog
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activeItems.map(item => (
              <div key={item.product_id} className="px-4 py-3.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatPrice(item.unit_price)} / {item.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setQty(item.product_id, item.quantity - 1)}
                    className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold text-lg flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all leading-none"
                    aria-label="Decrease"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-sm font-bold text-gray-900 tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => setQty(item.product_id, item.quantity + 1)}
                    className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold text-lg flex items-center justify-center hover:bg-amber-200 active:scale-95 transition-all leading-none"
                    aria-label="Increase"
                  >
                    +
                  </button>
                </div>
                <p className="text-sm font-bold text-gray-900 w-20 text-right flex-shrink-0">
                  {formatPrice(item.unit_price * item.quantity)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment method */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Payment Method</h2>
        </div>
        <div className="p-3 flex gap-3">
          <button
            onClick={() => setPaymentType('cash')}
            className={`flex-1 py-3.5 rounded-xl text-sm font-semibold border-2 transition-all ${
              paymentType === 'cash'
                ? 'bg-amber-600 border-amber-600 text-white shadow-md shadow-amber-200'
                : 'bg-white border-gray-200 text-gray-700 hover:border-amber-300'
            }`}
          >
            💵 Cash
          </button>
          <button
            onClick={() => creditEnabled && setPaymentType('credit')}
            disabled={!creditEnabled}
            className={`flex-1 py-3.5 rounded-xl text-sm font-semibold border-2 transition-all ${
              paymentType === 'credit'
                ? 'bg-amber-600 border-amber-600 text-white shadow-md shadow-amber-200'
                : creditEnabled
                ? 'bg-white border-gray-200 text-gray-700 hover:border-amber-300'
                : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
            }`}
          >
            📋 Credit
            {!creditEnabled && (
              <span className="block text-xs font-normal mt-0.5">3+ orders needed</span>
            )}
          </button>
        </div>
      </div>

      {/* Order summary */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-4 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-900">{formatPrice(total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Delivery fee</span>
            <span className="text-emerald-600 font-medium">Free</span>
          </div>
          <div className="border-t border-gray-100 pt-2.5 flex justify-between">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-bold text-amber-900 text-lg">{formatPrice(total)}</span>
          </div>
        </div>
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 bg-amber-50 rounded-xl px-3 py-2.5">
            <span className="text-lg">🚚</span>
            <p className="text-xs text-amber-800 font-medium">Delivery tomorrow, 5–6 PM window</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3.5 flex gap-2.5">
          <span className="text-lg flex-shrink-0">⚠️</span>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Place order */}
      <button
        onClick={handleConfirm}
        disabled={activeItems.length === 0 || isPending}
        className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none text-white font-bold rounded-2xl py-4 transition-all shadow-lg shadow-amber-200/60 active:scale-[0.98] mt-1"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Placing Order…
          </span>
        ) : (
          'Place Order'
        )}
      </button>
    </div>
  )
}
