import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ClearCartOnMount } from '@/components/cafe/clear-cart-on-mount'
import type { Order } from '@/lib/types'
import logger from '@/lib/logger'

export const metadata = { title: 'Order Confirmed — Sherpa Sips' }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatDeliveryDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return `${WEEKDAYS[date.getUTCDay()]}, ${MONTHS[month - 1]} ${day}`
}

function formatPrice(amount: number) {
  return `Rs. ${amount.toLocaleString('en-IN')}`
}

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>
}) {
  const { orderId } = await searchParams
  if (!orderId) redirect('/')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('cafe_id', user.id)
    .single<Order>()

  if (error || !order) {
    logger.error('Order not found on confirm page', { userId: user.id, orderId, msg: error?.message })
    redirect('/')
  }

  const shortId = orderId.split('-')[0].toUpperCase()

  return (
    <main className="min-h-screen bg-linear-to-b from-amber-50 to-white flex flex-col items-center justify-center px-4 py-12">
      <ClearCartOnMount />
      <div className="max-w-sm w-full space-y-4">
        {/* Success animation */}
        <div className="text-center mb-2">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-emerald-100 rounded-full mb-5 shadow-inner">
            <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Order Placed!</h1>
          <p className="text-gray-500 mt-1.5 text-sm">We've received your order and will confirm it shortly.</p>
        </div>

        {/* Order card */}
        <div className="bg-white rounded-3xl shadow-md overflow-hidden border border-gray-100">
          <div className="bg-amber-600 px-5 pt-5 pb-6">
            <p className="text-amber-200 text-xs font-semibold uppercase tracking-widest">Order ID</p>
            <p className="text-3xl font-bold font-mono text-white mt-1">{shortId}</p>
            <p className="text-amber-200 text-xs mt-1">
              {new Date(order.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            <div className="px-5 py-3.5 flex justify-between items-center">
              <span className="text-sm text-gray-500">Total</span>
              <span className="font-bold text-gray-900 text-base">{formatPrice(order.total_amount)}</span>
            </div>
            <div className="px-5 py-3.5 flex justify-between items-center">
              <span className="text-sm text-gray-500">Payment</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                order.payment_type === 'cash'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-blue-50 text-blue-700'
              }`}>
                {order.payment_type === 'cash' ? '💵 Cash' : '📋 Credit'}
              </span>
            </div>
            <div className="px-5 py-3.5 flex justify-between items-center">
              <span className="text-sm text-gray-500">Status</span>
              <span className="text-xs font-semibold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
                Received
              </span>
            </div>
            {order.delivery_date && (
              <div className="px-5 py-3.5 flex justify-between items-center">
                <span className="text-sm text-gray-500">Delivery</span>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatDeliveryDate(order.delivery_date)}</p>
                  <p className="text-xs text-gray-400">5–6 PM window</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5 pt-1">
          <Link
            href={`/orders/${orderId}`}
            className="block w-full bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-semibold rounded-2xl py-4 text-center transition-all shadow-lg shadow-amber-200/60"
          >
            Track Order
          </Link>
          <Link
            href="/"
            className="block w-full bg-white hover:bg-gray-50 active:scale-[0.98] text-gray-700 font-medium rounded-2xl py-4 text-center border border-gray-200 transition-all"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  )
}
