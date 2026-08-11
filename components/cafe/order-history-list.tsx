import Link from 'next/link'
import { ChevronRight, CheckCircle2, Truck, Clock, Package } from 'lucide-react'
import { BeanMark } from '@/components/brand/bean-mark'
import type { OrderWithPreview, OrderStatus } from '@/lib/types'

// The status ramp climbs the brand palette — cream foothills through gold and
// terracotta up to the olive summit — so progress reads as an ascent.
const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string; Icon: React.ElementType }> = {
  received:         { label: 'Received',         className: 'bg-cream-200 text-brand-900',  Icon: Clock },
  confirmed:        { label: 'Confirmed',        className: 'bg-brand-400 text-brand-950',  Icon: Package },
  out_for_delivery: { label: 'Out for Delivery', className: 'bg-brand-600 text-cream-50',   Icon: Truck },
  delivered:        { label: 'Delivered',        className: 'bg-olive-600 text-cream-100',  Icon: CheckCircle2 },
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
    <span className={`pill ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

function ItemThumb({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <span className="arch-sm flex h-12 w-10 shrink-0 items-center justify-center bg-cream-200">
        <BeanMark className="h-5 w-auto text-brand-900/30" />
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="arch-sm h-12 w-10 shrink-0 object-cover" />
  )
}

export function OrderHistoryList({ orders }: { orders: OrderWithPreview[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-cream-300 bg-white">
      <div className="border-b border-cream-300 bg-cream-100 px-4 py-3.5 sm:px-5">
        <h2 className="display-sm text-brand-900">Order History</h2>
      </div>

      <ul className="divide-y divide-cream-200">
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
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="flex items-center gap-3.5 px-4 py-4 transition-colors hover:bg-cream-100 sm:px-5"
              >
                <ItemThumb src={firstItem?.image_url ?? null} alt={firstItem?.name ?? 'Order'} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-sm font-semibold text-brand-900">#{shortId}</p>
                    <StatusBadge status={order.status} />
                  </div>

                  {namesLabel && (
                    <p className="mt-1.5 truncate text-xs text-gray-500">{namesLabel}</p>
                  )}

                  <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400">
                    <span>{formatDate(order.created_at)}</span>
                    <span className="text-cream-400">·</span>
                    <span className="font-display text-sm text-brand-900">
                      {formatPrice(order.total_amount)}
                    </span>
                    <span className="text-cream-400">·</span>
                    <span className="capitalize">{order.payment_type}</span>
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-cream-400" />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
