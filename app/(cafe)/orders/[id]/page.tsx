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
    <main className="min-h-screen bg-cream-100 pb-24 sm:pb-12">
      <RealtimeRefresh table="orders" filter={`id=eq.${id}`} />

      <header className="sticky top-0 z-20 flex items-center gap-3 bg-brand-900 px-4 py-3.5 text-cream-200 sm:px-6">
        <Link
          href="/orders"
          aria-label="Back to cart"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-cream-200/70 transition-colors hover:bg-cream-50/10 hover:text-cream-50"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-lg uppercase leading-none tracking-[0.1em] text-cream-50">
          Order Details
        </h1>
      </header>

      <div className="pt-6">
        <OrderDetailView order={orderResult.data} items={items} invoice={invoice} />
      </div>
    </main>
  )
}
