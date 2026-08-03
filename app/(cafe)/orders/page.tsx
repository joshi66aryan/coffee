import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, Package, CheckCircle2, Truck, Clock } from 'lucide-react'
import { CafeHeader } from '@/components/cafe/cafe-header'
import { CartSection } from '@/components/cafe/cart-section'
import { OrdersEmptyState } from '@/components/cafe/orders-empty-state'
import type { Order, Cafe } from '@/lib/types'
import logger from '@/lib/logger'

export const metadata = { title: 'My Orders — Sherpa Sips' }

const STATUS_CONFIG: Record<Order['status'], { label: string; className: string; Icon: React.ElementType }> = {
  received:         { label: 'Received',        className: 'bg-blue-50 text-blue-700',     Icon: Clock },
  confirmed:        { label: 'Confirmed',        className: 'bg-amber-50 text-amber-700',   Icon: Package },
  out_for_delivery: { label: 'Out for Delivery', className: 'bg-purple-50 text-purple-700', Icon: Truck },
  delivered:        { label: 'Delivered',        className: 'bg-emerald-50 text-emerald-700', Icon: CheckCircle2 },
}

function formatPrice(n: number) { return `Rs. ${n.toLocaleString('en-IN')}` }
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusBadge({ status }: { status: Order['status'] }) {
  const { label, className, Icon } = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [ordersResult, cafeResult] = await Promise.all([
    supabase.from('orders').select('*').eq('cafe_id', user.id).order('created_at', { ascending: false }),
    supabase.from('cafes').select('credit_enabled').eq('id', user.id).single<Pick<Cafe, 'credit_enabled'>>(),
  ])

  if (ordersResult.error) {
    logger.error('Failed to fetch orders', { userId: user.id, msg: ordersResult.error.message })
  }

  const orders = (ordersResult.data ?? []) as Order[]
  const creditEnabled = cafeResult.data?.credit_enabled ?? false

  return (
    <main className="min-h-screen bg-gray-50 pb-20 sm:pb-4">
      <CafeHeader />

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Cart — client-side, hides itself when empty */}
        <CartSection creditEnabled={creditEnabled} />

        {/* Order history */}
        {orders.length === 0 ? (
          <OrdersEmptyState />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 pt-3 pb-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Order History</p>
            </div>
            <div className="divide-y divide-gray-100">
              {orders.map(order => {
                const shortId = order.id.split('-')[0].toUpperCase()
                return (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-gray-900 font-mono">#{shortId}</p>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                        <span className="text-gray-300">·</span>
                        <p className="text-xs font-semibold text-amber-900">{formatPrice(order.total_amount)}</p>
                        <span className="text-gray-300">·</span>
                        <p className="text-xs text-gray-400 capitalize">{order.payment_type}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
