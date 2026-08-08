import { Download } from 'lucide-react'
import type { AdminOrder, InvoiceDownload, OrderLineItem, PaymentStatus } from '@/lib/types'

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

function formatDeliveryDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function OrderDetailCard({
  order,
  items,
  invoice,
}: {
  order: AdminOrder
  items: OrderLineItem[]
  invoice?: InvoiceDownload | null
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Items ({items.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {items.map(item => (
            <div key={item.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {item.quantity} {item.unit} × {formatPrice(item.unit_price_at_time_of_order)}
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-900 shrink-0">
                {formatPrice(item.quantity * item.unit_price_at_time_of_order)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        <div className="px-5 py-3.5 flex justify-between items-center">
          <span className="text-sm text-gray-500">Payment</span>
          <span className="text-sm font-medium text-gray-900 capitalize">{order.payment_type}</span>
        </div>
        <div className="px-5 py-3.5 flex justify-between items-center">
          <span className="text-sm text-gray-500">Payment Status</span>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PAYMENT_STATUS_CLASS[order.payment_status]}`}
          >
            {PAYMENT_STATUS_LABEL[order.payment_status]}
          </span>
        </div>
        {order.delivery_date && (
          <div className="px-5 py-3.5 flex justify-between items-center">
            <span className="text-sm text-gray-500">Delivery</span>
            <span className="text-sm font-medium text-gray-900">
              {formatDeliveryDate(order.delivery_date)}
            </span>
          </div>
        )}
        {order.invoice_number && (
          <div className="px-5 py-3.5 flex justify-between items-center">
            <span className="text-sm text-gray-500">Invoice</span>
            {invoice ? (
              <a
                href={invoice.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-mono text-blue-700 hover:text-blue-800"
              >
                {order.invoice_number}
                <Download className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="text-sm font-mono text-gray-900">{order.invoice_number}</span>
            )}
          </div>
        )}
        <div className="px-5 py-3.5 flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-900">Total</span>
          <span className="text-base font-bold text-gray-900">{formatPrice(order.total_amount)}</span>
        </div>
      </div>
    </div>
  )
}
