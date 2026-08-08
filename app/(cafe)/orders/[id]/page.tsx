import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { OrderDetailView, type OrderDetailItem } from '@/components/cafe/order-detail-view'
import { getInvoiceDownloadUrl } from '@/lib/cafe/order-actions'
import { RealtimeRefresh } from '@/components/ui/realtime-refresh'
import type { Order } from '@/lib/types'
import logger from '@/lib/logger'

export const metadata = { title: 'Order Details — Sherpa Sips' }

interface OrderItemRow {
  id: string
  product_id: string
  quantity: number
  unit_price_at_time_of_order: number
  products: { name: string; unit: string } | null
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [orderResult, itemsResult] = await Promise.all([
    supabase.from('orders').select('*').eq('id', id).eq('cafe_id', user.id).single<Order>(),
    supabase
      .from('order_items')
      .select('id, product_id, quantity, unit_price_at_time_of_order, products(name, unit)')
      .eq('order_id', id)
      .returns<OrderItemRow[]>(),
  ])

  if (orderResult.error || !orderResult.data) {
    logger.error('Order not found', {
      userId: user.id,
      orderId: id,
      msg: orderResult.error?.message,
    })
    notFound()
  }

  if (itemsResult.error) {
    logger.error('Failed to fetch order items', {
      userId: user.id,
      orderId: id,
      msg: itemsResult.error.message,
    })
  }

  const items: OrderDetailItem[] = (itemsResult.data ?? []).map(row => ({
    id: row.id,
    product_id: row.product_id,
    name: row.products?.name ?? 'Unknown product',
    unit: row.products?.unit ?? '',
    quantity: row.quantity,
    unit_price_at_time_of_order: row.unit_price_at_time_of_order,
  }))

  const invoice = await getInvoiceDownloadUrl(id)

  return (
    <main className="min-h-screen bg-gray-50 pb-20 sm:pb-4">
      <RealtimeRefresh table="orders" filter={`id=eq.${id}`} />
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <Link
          href="/orders"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-base font-bold text-gray-900">Order Details</h1>
      </header>

      <OrderDetailView order={orderResult.data} items={items} invoice={invoice} />
    </main>
  )
}
