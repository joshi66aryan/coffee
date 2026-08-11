import Link from 'next/link'
import { PaymentStatusToggle } from '@/components/admin/payment-status-toggle'
import type { AdminOrder, OrderStatus, PaymentStatus } from '@/lib/types'
import type { OrderSortColumn, SortDirection } from '@/lib/admin/order-queue'

const STATUS_LABEL: Record<OrderStatus, string> = {
  received: 'Received',
  confirmed: 'Confirmed',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
}

// Progression through the order lifecycle is expressed as a climb through the
// brand palette — cream foothills up to the olive summit — rather than the
// stock blue/purple/green status colours.
const STATUS_CLASS: Record<OrderStatus, string> = {
  received: 'bg-cream-200 text-brand-900',
  confirmed: 'bg-brand-400 text-brand-950',
  out_for_delivery: 'bg-brand-600 text-cream-50',
  delivered: 'bg-olive-600 text-cream-100',
}

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  paid: 'Paid',
  pending: 'Pending',
  due: 'Due',
}

const PAYMENT_STATUS_CLASS: Record<PaymentStatus, string> = {
  paid: 'bg-olive-600 text-cream-100',
  pending: 'bg-brand-400 text-brand-950',
  due: 'bg-red-600 text-cream-50',
}

function formatPrice(amount: number) {
  return `Rs. ${amount.toLocaleString('en-IN')}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props {
  orders: AdminOrder[]
  sort: OrderSortColumn
  dir: SortDirection
  basePath: string
  editablePayment?: boolean
}

function SortableHeader({
  column,
  label,
  sort,
  dir,
  basePath,
}: {
  column: OrderSortColumn
  label: string
  sort: OrderSortColumn
  dir: SortDirection
  basePath: string
}) {
  const isActive = sort === column
  const nextDir: SortDirection = isActive && dir === 'desc' ? 'asc' : 'desc'
  const href = `${basePath}?sort=${column}&dir=${nextDir}`

  return (
    <th>
      <Link
        href={href}
        className={`inline-flex items-center gap-1.5 transition-colors hover:text-brand-900 ${
          isActive ? 'text-brand-700' : ''
        }`}
      >
        {label}
        {isActive && <span aria-hidden="true">{dir === 'desc' ? '▼' : '▲'}</span>}
      </Link>
    </th>
  )
}

export function OrderQueueTable({ orders, sort, dir, basePath, editablePayment = false }: Props) {
  if (orders.length === 0) {
    return (
      <div className="px-5 py-16 text-center">
        <p className="display-sm text-brand-900">No orders here</p>
        <p className="mt-2 text-sm text-gray-500">Nothing matches this view yet.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="table-brand min-w-175">
        <thead>
          <tr>
            <th>Café</th>
            <th>Order</th>
            <th>Status</th>
            <th>Payment</th>
            <SortableHeader column="total_amount" label="Total" sort={sort} dir={dir} basePath={basePath} />
            <SortableHeader column="created_at" label="Placed" sort={sort} dir={dir} basePath={basePath} />
            <th className="text-right!">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => {
            const shortId = order.id.split('-')[0].toUpperCase()
            return (
              <tr key={order.id}>
                <td className="font-display text-base text-brand-900">{order.cafe_name}</td>
                <td className="font-mono text-xs text-gray-500">#{shortId}</td>
                <td>
                  <span className={`pill ${STATUS_CLASS[order.status]}`}>
                    {STATUS_LABEL[order.status]}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="eyebrow-sm capitalize text-gray-400">{order.payment_type}</span>
                    {editablePayment ? (
                      <PaymentStatusToggle orderId={order.id} status={order.payment_status} />
                    ) : (
                      <span className={`pill ${PAYMENT_STATUS_CLASS[order.payment_status]}`}>
                        {PAYMENT_STATUS_LABEL[order.payment_status]}
                      </span>
                    )}
                  </div>
                </td>
                <td className="font-display text-base text-brand-900 tabular-nums">
                  {formatPrice(order.total_amount)}
                </td>
                <td className="whitespace-nowrap text-xs text-gray-400 tabular-nums">
                  {formatDate(order.created_at)}
                </td>
                <td className="text-right">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-display text-sm uppercase tracking-[0.12em] text-brand-700 transition-colors hover:text-brand-900"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
