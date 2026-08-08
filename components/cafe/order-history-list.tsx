import Link from 'next/link'
import { ChevronRight, CheckCircle2, Truck, Clock, Package } from 'lucide-react'
import type { OrderWithPreview, OrderStatus } from '@/lib/types'

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string; Icon: React.ElementType }> = {
  received:         { label: 'Received',        className: 'bg-blue-50 text-blue-700',     Icon: Clock },
  confirmed:        { label: 'Confirmed',        className: 'bg-amber-50 text-amber-700',   Icon: Package },
  out_for_delivery: { label: 'Out for Delivery', className: 'bg-purple-50 text-purple-700', Icon: Truck },
  delivered:        { label: 'Delivered',        className: 'bg-emerald-50 text-emerald-700', Icon: CheckCircle2 },
}

function formatPrice(n: number) {
  return `Rs. ${n.toLocaleString('en-IN')}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const { label, className, Icon } = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

function ItemThumb({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <span className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-lg shrink-0">
        ☕
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="w-10 h-10 rounded-xl object-cover shrink-0" />
  )
}

export function OrderHistoryList({ orders }: { orders: OrderWithPreview[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Order History</p>
      </div>
      <div className="divide-y divide-gray-100">
        {orders.map(order => {
          const shortId = order.id.split('-')[0].toUpperCase()
          const firstItem = order.items[0]
          const namesLabel =
            order.items.length === 0
              ? ''
              : order.items.length === 1
              ? firstItem.name
              : `${firstItem.name} +${order.items.length - 1} more`

          return (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <ItemThumb src={firstItem?.image_url ?? null} alt={firstItem?.name ?? 'Order'} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-gray-900 font-mono">#{shortId}</p>
                  <StatusBadge status={order.status} />
                </div>
                {namesLabel && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{namesLabel}</p>
                )}
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
  )
}
