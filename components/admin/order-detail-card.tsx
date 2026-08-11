import { Download } from 'lucide-react'
import type { AdminOrder, InvoiceDownload, OrderLineItem, PaymentStatus } from '@/lib/types'

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
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-cream-300 bg-white">
        <div className="flex items-baseline justify-between gap-3 border-b border-cream-300 bg-cream-100 px-5 py-3.5">
          <h2 className="display-sm text-brand-900">Items</h2>
          <span className="eyebrow-sm text-gray-400">{items.length}</span>
        </div>
        <ul className="divide-y divide-cream-200">
          {items.map(item => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate font-display text-base leading-none text-brand-900">
                  {item.name}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  {item.quantity} {item.unit} × {formatPrice(item.unit_price_at_time_of_order)}
                </p>
              </div>
              <p className="shrink-0 font-display text-base text-brand-900 tabular-nums">
                {formatPrice(item.quantity * item.unit_price_at_time_of_order)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="overflow-hidden rounded-xl border border-cream-300 bg-white">
        <dl className="divide-y divide-cream-200">
          <div className="flex items-center justify-between px-5 py-3.5">
            <dt className="eyebrow-sm text-gray-400">Payment</dt>
            <dd className="font-display text-base capitalize text-brand-900">{order.payment_type}</dd>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5">
            <dt className="eyebrow-sm text-gray-400">Payment Status</dt>
            <dd>
              <span className={`pill ${PAYMENT_STATUS_CLASS[order.payment_status]}`}>
                {PAYMENT_STATUS_LABEL[order.payment_status]}
              </span>
            </dd>
          </div>
          {order.delivery_date && (
            <div className="flex items-center justify-between px-5 py-3.5">
              <dt className="eyebrow-sm text-gray-400">Delivery</dt>
              <dd className="font-display text-base text-brand-900">
                {formatDeliveryDate(order.delivery_date)}
              </dd>
            </div>
          )}
          {order.invoice_number && (
            <div className="flex items-center justify-between px-5 py-3.5">
              <dt className="eyebrow-sm text-gray-400">Invoice</dt>
              <dd>
                {invoice ? (
                  <a
                    href={invoice.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-sm text-brand-700 underline underline-offset-2 hover:text-brand-900"
                  >
                    {order.invoice_number}
                    <Download className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span className="font-mono text-sm text-brand-900">{order.invoice_number}</span>
                )}
              </dd>
            </div>
          )}
          <div className="flex items-baseline justify-between bg-cream-100 px-5 py-4">
            <dt className="eyebrow text-gray-500">Total</dt>
            <dd className="font-display text-2xl leading-none text-brand-900 tabular-nums">
              {formatPrice(order.total_amount)}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
