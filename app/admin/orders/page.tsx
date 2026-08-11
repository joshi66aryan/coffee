import { Suspense } from 'react'
import { getOrders } from '@/lib/admin/actions'
import { PAGE_SIZE } from '@/lib/admin/constants'
import { parseOrderSort, parseOrderStatusFilter, splitActiveOrders } from '@/lib/admin/order-queue'
import { OrderQueueTable } from '@/components/admin/order-queue-table'
import { OrderFilters } from '@/components/admin/order-filters'
import { SearchInput } from '@/components/admin/search-input'
import { Pagination } from '@/components/ui/pagination'
import { PageMasthead } from '@/components/ui/page-masthead'
import { RealtimeRefresh } from '@/components/ui/realtime-refresh'

export const metadata = { title: 'Orders — Admin' }

interface PageProps {
  searchParams: Promise<{
    q?: string
    sort?: string
    dir?: string
    page?: string
    status?: string
    from?: string
    to?: string
  }>
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const {
    q,
    sort: sortParam,
    dir: dirParam,
    page: pageStr,
    status: statusParam,
    from: dateFrom,
    to: dateTo,
  } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
  const { sort, dir } = parseOrderSort(sortParam, dirParam)
  const status = parseOrderStatusFilter(statusParam)

  let result: Awaited<ReturnType<typeof getOrders>>
  try {
    result = await getOrders({ q, sort, dir, page, status, dateFrom, dateTo })
  } catch {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-100">
        <p className="display-md text-brand-900">Access denied</p>
      </div>
    )
  }

  const { items: orders, total } = result
  const isFiltered = Boolean(q) || Boolean(status) || Boolean(dateFrom) || Boolean(dateTo)
  const { active, rest } = splitActiveOrders(orders)
  const basePath = '/admin/orders'

  return (
    <div className="min-h-screen bg-cream-100 pb-16">
      <RealtimeRefresh table="orders" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <PageMasthead
          eyebrow="Fulfilment"
          title="Orders"
          description={`${total} total`}
          action={
            <Suspense>
              <SearchInput placeholder="Search by café name…" />
            </Suspense>
          }
        />

        <div className="pt-6">
          <Suspense>
            <OrderFilters />
          </Suspense>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-xl border border-cream-300 bg-white px-8 py-16 text-center">
            <p className="display-md text-brand-900">
              {isFiltered ? 'No matching orders' : 'No orders yet'}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {isFiltered ? 'Try widening the filters above.' : 'New orders will land here as cafés place them.'}
            </p>
          </div>
        ) : isFiltered ? (
          <section className="overflow-hidden rounded-xl border border-cream-300 bg-white">
            <OrderQueueTable orders={orders} sort={sort} dir={dir} basePath={basePath} />
          </section>
        ) : (
          <div className="space-y-6">
            {active.length > 0 && (
              <section className="overflow-hidden rounded-xl border border-brand-400 bg-white">
                <div className="flex items-baseline justify-between gap-3 border-b border-brand-300 bg-brand-50 px-5 py-3.5">
                  <h2 className="display-sm text-brand-900">Active Orders</h2>
                  <span className="eyebrow-sm text-brand-600">{active.length}</span>
                </div>
                <OrderQueueTable orders={active} sort={sort} dir={dir} basePath={basePath} />
              </section>
            )}

            {rest.length > 0 && (
              <section className="overflow-hidden rounded-xl border border-cream-300 bg-white">
                <div className="border-b border-cream-300 bg-cream-100 px-5 py-3.5">
                  <h2 className="display-sm text-brand-900">Delivered</h2>
                </div>
                <OrderQueueTable orders={rest} sort={sort} dir={dir} basePath={basePath} />
              </section>
            )}
          </div>
        )}

        <Pagination
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          basePath={basePath}
          q={q}
          extraParams={{ sort, dir, ...(status ? { status } : {}), ...(dateFrom ? { from: dateFrom } : {}), ...(dateTo ? { to: dateTo } : {}) }}
        />
      </div>
    </div>
  )
}
