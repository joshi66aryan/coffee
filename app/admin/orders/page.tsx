import { Suspense } from 'react'
import { getOrders } from '@/lib/admin/actions'
import { PAGE_SIZE } from '@/lib/admin/constants'
import { parseOrderSort, parseOrderStatusFilter, splitActiveOrders } from '@/lib/admin/order-queue'
import { OrderQueueTable } from '@/components/admin/order-queue-table'
import { OrderFilters } from '@/components/admin/order-filters'
import { SearchInput } from '@/components/admin/search-input'
import { Pagination } from '@/components/ui/pagination'
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Access denied.</p>
      </div>
    )
  }

  const { items: orders, total } = result
  const isFiltered = Boolean(q) || Boolean(status) || Boolean(dateFrom) || Boolean(dateTo)
  const { active, rest } = splitActiveOrders(orders)
  const basePath = '/admin/orders'

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <RealtimeRefresh table="orders" />
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} total</p>
          </div>
          <Suspense>
            <SearchInput placeholder="Search by café name…" />
          </Suspense>
        </div>

        <Suspense>
          <OrderFilters />
        </Suspense>

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">
              {isFiltered ? 'No orders match these filters.' : 'No orders yet.'}
            </p>
          </div>
        ) : isFiltered ? (
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5">
              <OrderQueueTable orders={orders} sort={sort} dir={dir} basePath={basePath} />
            </div>
          </section>
        ) : (
          <div className="space-y-6">
            {active.length > 0 && (
              <section className="bg-white rounded-xl border border-amber-200 overflow-hidden">
                <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
                  <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                    Active Orders ({active.length})
                  </h2>
                </div>
                <div className="px-5">
                  <OrderQueueTable orders={active} sort={sort} dir={dir} basePath={basePath} />
                </div>
              </section>
            )}

            {rest.length > 0 && (
              <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Delivered
                  </h2>
                </div>
                <div className="px-5">
                  <OrderQueueTable orders={rest} sort={sort} dir={dir} basePath={basePath} />
                </div>
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
