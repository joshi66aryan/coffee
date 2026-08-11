import { Package, CheckCircle2, Truck, Clock, Download } from 'lucide-react'
import type { InvoiceDownload, Order } from '@/lib/types'
import { ORDER_STATUS_STEPS, getStatusStepIndex } from '@/lib/cafe/order-status'

export interface OrderDetailItem {
  id: string
  product_id: string
  name: string
  unit: string
  quantity: number
  unit_price_at_time_of_order: number
}

const STEP_CONFIG: Record<Order['status'], { label: string; caption: string; Icon: React.ElementType }> = {
  received: { label: 'Received', caption: 'Order logged at the roastery', Icon: Clock },
  confirmed: { label: 'Confirmed', caption: 'Beans reserved and packed', Icon: Package },
  out_for_delivery: { label: 'Out for Delivery', caption: 'On the road to your café', Icon: Truck },
  delivered: { label: 'Delivered', caption: 'Handed over — enjoy the brew', Icon: CheckCircle2 },
}

const PAYMENT_STATUS_LABEL: Record<Order['payment_status'], string> = {
  paid: 'Paid',
  pending: 'Pending',
  due: 'Due',
}

const PAYMENT_STATUS_CLASS: Record<Order['payment_status'], string> = {
  paid: 'bg-olive-600 text-cream-100',
  pending: 'bg-brand-400 text-brand-950',
  due: 'bg-red-600 text-cream-50',
}

function formatPrice(amount: number) {
  return `Rs. ${amount.toLocaleString('en-IN')}`
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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

export function OrderDetailView({
  order,
  items,
  invoice,
}: {
  order: Order
  items: OrderDetailItem[]
  invoice?: InvoiceDownload | null
}) {
  const currentStep = getStatusStepIndex(order.status)
  const shortId = order.id.split('-')[0].toUpperCase()

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 pb-8 sm:px-6">
      {/* ---- Docket header ---------------------------------------------- */}
      <div className="rounded-xl bg-brand-900 px-5 py-5 text-cream-200 sm:px-6">
        <p className="eyebrow-sm text-cream-200/50">Order</p>
        <p className="mt-2 font-display text-4xl leading-none tracking-wider text-brand-400">
          #{shortId}
        </p>
        <p className="mt-2.5 text-xs text-cream-200/50">{formatDateTime(order.created_at)}</p>
      </div>

      {/* ---- The climb --------------------------------------------------- */}
      <section className="overflow-hidden rounded-xl border border-cream-300 bg-white">
        <div className="border-b border-cream-300 bg-cream-100 px-5 py-3.5">
          <h2 className="display-sm text-brand-900">Delivery Progress</h2>
        </div>

        <ol className="px-5 py-5">
          {ORDER_STATUS_STEPS.map((step, index) => {
            const { label, caption, Icon } = STEP_CONFIG[step]
            const isComplete = index < currentStep
            const isCurrent = index === currentStep
            const isLast = index === ORDER_STATUS_STEPS.length - 1
            const isActive = isComplete || isCurrent

            return (
              <li key={step} className="flex gap-4">
                {/* The trail: filled behind you, faint ahead. */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                      isCurrent
                        ? 'bg-brand-400 text-brand-950'
                        : isComplete
                        ? 'bg-brand-900 text-cream-50'
                        : 'bg-cream-200 text-brand-900/30'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {!isLast && (
                    <div
                      className={`min-h-8 w-0.5 flex-1 ${isComplete ? 'bg-brand-900' : 'bg-cream-200'}`}
                    />
                  )}
                </div>

                <div className={isLast ? 'pb-0 pt-1.5' : 'pb-7 pt-1.5'}>
                  <p
                    className={`font-display text-base leading-none ${
                      isActive ? 'text-brand-900' : 'text-gray-300'
                    }`}
                  >
                    {label}
                  </p>
                  <p
                    className={`mt-2 text-xs ${
                      isCurrent ? 'font-semibold text-brand-600' : 'text-gray-400'
                    }`}
                  >
                    {isCurrent ? 'Current status' : caption}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      {/* ---- Items -------------------------------------------------------- */}
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

      {/* ---- Summary ------------------------------------------------------ */}
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
