import { Suspense } from 'react'
import Link from 'next/link'
import { getPayments } from '@/lib/admin/actions'
import { PAGE_SIZE } from '@/lib/admin/constants'
import { parseOrderSort } from '@/lib/admin/order-queue'
import { parsePaymentFilter, PAYMENT_FILTERS, type PaymentFilter } from '@/lib/admin/payments'
import { OrderQueueTable } from '@/components/admin/order-queue-table'
import { SearchInput } from '@/components/admin/search-input'
import { Pagination } from '@/components/ui/pagination'
import { RealtimeRefresh } from '@/components/ui/realtime-refresh'

export const metadata = { title: 'Payments — Admin' }

const FILTER_LABEL: Record<PaymentFilter, string> = {
  unpaid: 'Unpaid',
  paid: 'Paid',
  all: 'All',
}

interface PageProps {
  searchParams: Promise<{ q?: string; filter?: string; sort?: string; dir?: string; page?: string }>
}

export default async function AdminPaymentsPage({ searchParams }: PageProps) {
  const { q, filter: filterParam, sort: sortParam, dir: dirParam, page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
  const filter = parsePaymentFilter(filterParam)
  const { sort, dir } = parseOrderSort(sortParam, dirParam ?? 'asc')

  let result: Awaited<ReturnType<typeof getPayments>>
  try {
    result = await getPayments({ q, filter, sort, dir, page })
  } catch {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Access denied.</p>
      </div>
    )
  }

  const { items: orders, total, outstandingTotal } = result
  const basePath = '/admin/payments'

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <RealtimeRefresh table="orders" />
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Rs. {outstandingTotal.toLocaleString('en-IN')} outstanding across all cafés
            </p>
          </div>
          <Suspense>
            <SearchInput placeholder="Search by café name…" />
          </Suspense>
        </div>

        <div className="flex gap-2 mb-4">
          {PAYMENT_FILTERS.map(f => (
            <Link
              key={f}
              href={`${basePath}?filter=${f}`}
              aria-current={filter === f ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {FILTER_LABEL[f]}
            </Link>
          ))}
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">
              {q
                ? `No orders match "${q}".`
                : filter === 'unpaid'
                ? 'No unpaid orders — all caught up.'
                : 'No orders here.'}
            </p>
          </div>
        ) : (
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5">
              <OrderQueueTable orders={orders} sort={sort} dir={dir} basePath={basePath} editablePayment />
            </div>
          </section>
        )}

        <Pagination
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          basePath={basePath}
          q={q}
          extraParams={{ filter, sort, dir }}
        />
      </div>
    </div>
  )
}
