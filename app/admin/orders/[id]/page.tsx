import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminOrder, getOrderInvoice } from '@/lib/admin/actions'
import { OrderDetailCard } from '@/components/admin/order-detail-card'
import { OrderStatusActions } from '@/components/admin/order-status-actions'
import { RealtimeRefresh } from '@/components/ui/realtime-refresh'

export const metadata = { title: 'Order Details — Admin' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params

  let result: Awaited<ReturnType<typeof getAdminOrder>>
  try {
    result = await getAdminOrder(id)
  } catch {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Access denied.</p>
      </div>
    )
  }

  if (!result) notFound()
  const { order, items } = result
  const shortId = order.id.split('-')[0].toUpperCase()
  const invoice = await getOrderInvoice(order.id)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <RealtimeRefresh table="orders" filter={`id=eq.${order.id}`} />
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← Orders
          </Link>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order #{shortId}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{order.cafe_name}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Status</h2>
          <OrderStatusActions orderId={order.id} status={order.status} />
        </div>

        <OrderDetailCard order={order} items={items} invoice={invoice} />
      </div>
    </div>
  )
}
