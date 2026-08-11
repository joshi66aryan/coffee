import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CafeHeader } from '@/components/cafe/cafe-header'
import { PageMasthead } from '@/components/ui/page-masthead'
import { OrderHistoryList } from '@/components/cafe/order-history-list'
import { OrderHistoryEmptyState } from '@/components/cafe/order-history-empty-state'
import { UnpaidOrdersEmptyState } from '@/components/cafe/unpaid-orders-empty-state'
import { Pagination } from '@/components/ui/pagination'
import { RealtimeRefresh } from '@/components/ui/realtime-refresh'
import { groupItemsByOrder, type OrderItemPreviewRow } from '@/lib/cafe/order-preview'
import { parseOrderFilter } from '@/lib/cafe/order-filter'
import { ORDERS_PAGE_SIZE } from '@/lib/cafe/constants'
import type { Cafe, Order, OrderWithPreview } from '@/lib/types'
import logger from '@/lib/logger'

export const metadata = { title: 'Your Orders — Sherpa Sips' }

interface PageProps {
  searchParams: Promise<{ page?: string; filter?: string }>
}

export default async function ProfileOrdersPage({ searchParams }: PageProps) {
  const { page: pageStr, filter: filterParam } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
  const filter = parseOrderFilter(filterParam)
  const from = (page - 1) * ORDERS_PAGE_SIZE
  const to = from + ORDERS_PAGE_SIZE - 1

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let ordersQuery = supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('cafe_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filter === 'unpaid') {
    ordersQuery = ordersQuery.in('payment_status', ['pending', 'due'])
  }

  const [cafeResult, ordersResult] = await Promise.all([
    supabase.from('cafes').select('name').eq('id', user.id).single<Pick<Cafe, 'name'>>(),
    ordersQuery.returns<Order[]>(),
  ])

  if (ordersResult.error) {
    logger.error('Failed to fetch orders', { userId: user.id, msg: ordersResult.error.message })
  }

  const cafe = cafeResult.data
  const pagedOrders = ordersResult.data ?? []
  const total = ordersResult.count ?? 0

  let itemsByOrder: Record<string, ReturnType<typeof groupItemsByOrder>[string]> = {}
  const orderIds = pagedOrders.map(o => o.id)
  if (orderIds.length > 0) {
    const { data: itemRows, error: itemsError } = await supabase
      .from('order_items')
      .select('order_id, product_id, quantity, products(name, image_url)')
      .in('order_id', orderIds)
      .returns<OrderItemPreviewRow[]>()

    if (itemsError) {
      logger.error('Failed to fetch order item previews', { userId: user.id, msg: itemsError.message })
    }
    itemsByOrder = groupItemsByOrder(itemRows ?? [])
  }

  const ordersWithPreview: OrderWithPreview[] = pagedOrders.map(order => ({
    ...order,
    items: itemsByOrder[order.id] ?? [],
  }))

  return (
    <main className="min-h-screen bg-cream-100 pb-24 sm:pb-12">
      <RealtimeRefresh table="orders" filter={`cafe_id=eq.${user.id}`} />
      <CafeHeader cafeName={cafe?.name} />

      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <PageMasthead
          eyebrow={filter === 'unpaid' ? 'Outstanding' : 'History'}
          title={filter === 'unpaid' ? 'Unpaid Orders' : 'Your Orders'}
          backHref="/profile"
          backLabel="Account"
          action={
            filter === 'unpaid' ? (
              <Link href="/profile/orders" className="btn btn-outline btn-sm">
                View all
              </Link>
            ) : undefined
          }
        />

        <div className="pt-6">
          {total === 0 ? (
            filter === 'unpaid' ? <UnpaidOrdersEmptyState /> : <OrderHistoryEmptyState />
          ) : (
            <>
              <OrderHistoryList orders={ordersWithPreview} />
              <Pagination
                page={page}
                total={total}
                pageSize={ORDERS_PAGE_SIZE}
                basePath="/profile/orders"
                extraParams={filter === 'unpaid' ? { filter } : undefined}
              />
            </>
          )}
        </div>
      </div>
    </main>
  )
}
