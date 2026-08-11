import { Suspense } from 'react'
import Link from 'next/link'
import { getPayments } from '@/lib/admin/actions'
import { PAGE_SIZE } from '@/lib/admin/constants'
import { parseOrderSort } from '@/lib/admin/order-queue'
import { parsePaymentFilter, PAYMENT_FILTERS, type PaymentFilter } from '@/lib/admin/payments'
import { OrderQueueTable } from '@/components/admin/order-queue-table'
import { SearchInput } from '@/components/admin/search-input'
import { Pagination } from '@/components/ui/pagination'
import { PageMasthead } from '@/components/ui/page-masthead'
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
      <div className="flex min-h-screen items-center justify-center bg-cream-100">
        <p className="display-md text-brand-900">Access denied</p>
      </div>
    )
  }

  const { items: orders, total, outstandingTotal } = result
  const basePath = '/admin/payments'

  return (
    <div className="min-h-screen bg-cream-100 pb-16">
      <RealtimeRefresh table="orders" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <PageMasthead
          eyebrow="Ledger"
          title="Payments"
          action={
            <Suspense>
              <SearchInput placeholder="Search by café name…" />
            </Suspense>
          }
        />

        {/* Outstanding balance carried as a display statistic, not body copy. */}
        <div className="mt-6 flex items-baseline justify-between gap-4 rounded-xl bg-brand-900 px-5 py-4 text-cream-200 sm:px-6">
          <span className="eyebrow-sm text-cream-200/55">Outstanding across all cafés</span>
          <span className="display-stat text-brand-400">
            <span className="text-[0.5em]">Rs.</span> {outstandingTotal.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="my-6 flex gap-2">
          {PAYMENT_FILTERS.map(f => (
            <Link
              key={f}
              href={`${basePath}?filter=${f}`}
              aria-current={filter === f ? 'page' : undefined}
              data-active={filter === f}
              className="chip"
            >
              {FILTER_LABEL[f]}
            </Link>
          ))}
        </div>

        {orders.length === 0 ? (
          <div className="rounded-xl border border-cream-300 bg-white px-8 py-16 text-center">
            <p className="display-md text-brand-900">
              {q ? 'No matching orders' : filter === 'unpaid' ? 'All caught up' : 'No orders here'}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {q
                ? `Nothing matches “${q}”.`
                : filter === 'unpaid'
                ? 'Every order has been settled.'
                : 'Orders will appear here once placed.'}
            </p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-xl border border-cream-300 bg-white">
            <OrderQueueTable orders={orders} sort={sort} dir={dir} basePath={basePath} editablePayment />
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
