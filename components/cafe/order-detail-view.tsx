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

const STEP_CONFIG: Record<Order['status'], { label: string; Icon: React.ElementType }> = {
  received: { label: 'Received', Icon: Clock },
  confirmed: { label: 'Confirmed', Icon: Package },
  out_for_delivery: { label: 'Out for Delivery', Icon: Truck },
  delivered: { label: 'Delivered', Icon: CheckCircle2 },
}

const PAYMENT_STATUS_LABEL: Record<Order['payment_status'], string> = {
  paid: 'Paid',
  pending: 'Pending',
  due: 'Due',
}

const PAYMENT_STATUS_CLASS: Record<Order['payment_status'], string> = {
  paid: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  due: 'bg-red-50 text-red-700',
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
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Order</p>
        <p className="text-2xl font-bold font-mono text-gray-900 mt-0.5">#{shortId}</p>
        <p className="text-xs text-gray-400 mt-1">{formatDateTime(order.created_at)}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Status</p>
        <ol>
          {ORDER_STATUS_STEPS.map((step, index) => {
            const { label, Icon } = STEP_CONFIG[step]
            const isComplete = index < currentStep
            const isCurrent = index === currentStep
            const isLast = index === ORDER_STATUS_STEPS.length - 1
            const isActive = isComplete || isCurrent
            return (
              <li key={step} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {!isLast && (
                    <div
                      className={`w-0.5 flex-1 min-h-6 ${
                        isComplete ? 'bg-amber-600' : 'bg-gray-100'
                      }`}
                    />
                  )}
                </div>
                <div className="pb-6">
                  <p
                    className={`text-sm font-semibold ${
                      isActive ? 'text-gray-900' : 'text-gray-300'
                    }`}
                  >
                    {label}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-amber-600 font-medium mt-0.5">Current status</p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Items ({items.length})
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {items.map(item => (
            <div key={item.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {item.quantity} {item.unit} × {formatPrice(item.unit_price_at_time_of_order)}
                </p>
              </div>
              <p className="text-sm font-bold text-gray-900 shrink-0">
                {formatPrice(item.quantity * item.unit_price_at_time_of_order)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        <div className="px-4 py-3.5 flex justify-between items-center">
          <span className="text-sm text-gray-500">Payment</span>
          <span className="text-sm font-medium text-gray-900 capitalize">{order.payment_type}</span>
        </div>
        <div className="px-4 py-3.5 flex justify-between items-center">
          <span className="text-sm text-gray-500">Payment Status</span>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PAYMENT_STATUS_CLASS[order.payment_status]}`}
          >
            {PAYMENT_STATUS_LABEL[order.payment_status]}
          </span>
        </div>
        {order.delivery_date && (
          <div className="px-4 py-3.5 flex justify-between items-center">
            <span className="text-sm text-gray-500">Delivery</span>
            <span className="text-sm font-medium text-gray-900">
              {formatDeliveryDate(order.delivery_date)}
            </span>
          </div>
        )}
        {order.invoice_number && (
          <div className="px-4 py-3.5 flex justify-between items-center">
            <span className="text-sm text-gray-500">Invoice</span>
            {invoice ? (
              <a
                href={invoice.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-mono text-amber-700 hover:text-amber-800"
              >
                {order.invoice_number}
                <Download className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="text-sm font-mono text-gray-900">{order.invoice_number}</span>
            )}
          </div>
        )}
        <div className="px-4 py-3.5 flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-900">Total</span>
          <span className="text-base font-bold text-amber-900">{formatPrice(order.total_amount)}</span>
        </div>
      </div>
    </div>
  )
}
