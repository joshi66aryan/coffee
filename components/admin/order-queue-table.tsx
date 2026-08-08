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

const STATUS_CLASS: Record<OrderStatus, string> = {
  received: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-amber-100 text-amber-800',
  out_for_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-emerald-100 text-emerald-800',
}

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  paid: 'Paid',
  pending: 'Pending',
  due: 'Due',
}

const PAYMENT_STATUS_CLASS: Record<PaymentStatus, string> = {
  paid: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  due: 'bg-red-100 text-red-800',
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
    <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
      <Link href={href} className="inline-flex items-center gap-1 hover:text-gray-600">
        {label}
        {isActive && <span aria-hidden="true">{dir === 'desc' ? '▼' : '▲'}</span>}
      </Link>
    </th>
  )
}

export function OrderQueueTable({ orders, sort, dir, basePath, editablePayment = false }: Props) {
  if (orders.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-gray-500">No orders here.</div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-175">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Café</th>
            <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Order</th>
            <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
            <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Payment</th>
            <SortableHeader column="total_amount" label="Total" sort={sort} dir={dir} basePath={basePath} />
            <SortableHeader column="created_at" label="Placed" sort={sort} dir={dir} basePath={basePath} />
            <th className="py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => {
            const shortId = order.id.split('-')[0].toUpperCase()
            return (
              <tr key={order.id} className="border-b border-gray-100 last:border-0">
                <td className="py-3 pr-4 text-sm font-medium text-gray-900">{order.cafe_name}</td>
                <td className="py-3 pr-4 text-sm font-mono text-gray-600">#{shortId}</td>
                <td className="py-3 pr-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_CLASS[order.status]}`}>
                    {STATUS_LABEL[order.status]}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-600 capitalize">{order.payment_type}</span>
                    {editablePayment ? (
                      <PaymentStatusToggle orderId={order.id} status={order.payment_status} />
                    ) : (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PAYMENT_STATUS_CLASS[order.payment_status]}`}>
                        {PAYMENT_STATUS_LABEL[order.payment_status]}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4 text-sm text-gray-900 tabular-nums">{formatPrice(order.total_amount)}</td>
                <td className="py-3 pr-4 text-xs text-gray-400 tabular-nums whitespace-nowrap">
                  {formatDate(order.created_at)}
                </td>
                <td className="py-3 text-right">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="text-sm text-amber-700 hover:text-amber-900 font-medium"
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
