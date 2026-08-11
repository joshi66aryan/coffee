import { notFound } from 'next/navigation'
import { getAdminOrder, getOrderInvoice } from '@/lib/admin/actions'
import { OrderDetailCard } from '@/components/admin/order-detail-card'
import { OrderStatusActions } from '@/components/admin/order-status-actions'
import { RealtimeRefresh } from '@/components/ui/realtime-refresh'
import { PageMasthead } from '@/components/ui/page-masthead'

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
      <div className="flex min-h-screen items-center justify-center bg-cream-100">
        <p className="display-md text-brand-900">Access denied</p>
      </div>
    )
  }

  if (!result) notFound()
  const { order, items } = result
  const shortId = order.id.split('-')[0].toUpperCase()
  const invoice = await getOrderInvoice(order.id)

  return (
    <div className="min-h-screen bg-cream-100 pb-16">
      <RealtimeRefresh table="orders" filter={`id=eq.${order.id}`} />
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <PageMasthead
          eyebrow={order.cafe_name}
          title={`Order #${shortId}`}
          backHref="/admin/orders"
          backLabel="Orders"
        />

        <div className="space-y-5 pt-6">
          <div className="rounded-xl border border-cream-300 bg-white p-5">
            <h2 className="eyebrow mb-4">Set Status</h2>
            <OrderStatusActions orderId={order.id} status={order.status} />
          </div>

          <OrderDetailCard order={order} items={items} invoice={invoice} />
        </div>
      </div>
    </div>
  )
}
