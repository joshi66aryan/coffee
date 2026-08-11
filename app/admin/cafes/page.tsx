import { Suspense } from 'react'
import Link from 'next/link'
import { getCafes } from '@/lib/admin/actions'
import { PAGE_SIZE } from '@/lib/admin/constants'
import { CafeApprovalActions } from '@/components/admin/cafe-approval-actions'
import { SearchInput } from '@/components/admin/search-input'
import { Pagination } from '@/components/ui/pagination'
import { PageMasthead } from '@/components/ui/page-masthead'
import { RealtimeRefresh } from '@/components/ui/realtime-refresh'
import type { Cafe, CafeStatus } from '@/lib/types'

export const metadata = { title: 'Cafés — Admin' }

const STATUS_LABEL: Record<CafeStatus, string> = {
  pending:  'Pending',
  active:   'Active',
  rejected: 'Rejected',
}

const STATUS_CLASS: Record<CafeStatus, string> = {
  pending:  'bg-brand-400 text-brand-950',
  active:   'bg-olive-600 text-cream-100',
  rejected: 'bg-cream-300 text-brand-900',
}

function CafeRow({ cafe, showActions }: { cafe: Cafe; showActions: boolean }) {
  return (
    <tr>
      <td>
        <p className="font-display text-base leading-none text-brand-900">{cafe.name}</p>
        <p className="mt-1.5 max-w-xs truncate text-xs text-gray-400">{cafe.delivery_address}</p>
      </td>
      <td className="text-gray-600">{cafe.contact_name}</td>
      <td className="text-gray-600 tabular-nums">{cafe.phone}</td>
      <td className="text-gray-600">{cafe.neighborhood}</td>
      <td>
        <span className={`pill ${STATUS_CLASS[cafe.status]}`}>{STATUS_LABEL[cafe.status]}</span>
      </td>
      <td className="whitespace-nowrap text-xs text-gray-400 tabular-nums">
        {new Date(cafe.created_at).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </td>
      <td className="text-right">
        <div className="flex items-center justify-end gap-3">
          {showActions && cafe.status === 'pending' && (
            <CafeApprovalActions cafeId={cafe.id} />
          )}
          <Link
            href={`/admin/cafes/${cafe.id}`}
            className="whitespace-nowrap font-display text-sm uppercase tracking-[0.12em] text-brand-700 transition-colors hover:text-brand-900"
          >
            View →
          </Link>
        </div>
      </td>
    </tr>
  )
}

function CafeTable({ cafes, showActions }: { cafes: Cafe[]; showActions: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="table-brand min-w-175">
        <thead>
          <tr>
            <th>Café</th>
            <th>Contact</th>
            <th>Phone</th>
            <th>Neighborhood</th>
            <th>Status</th>
            <th>Applied</th>
            <th className="text-right!">Actions</th>
          </tr>
        </thead>
        <tbody>
          {cafes.map((cafe) => (
            <CafeRow key={cafe.id} cafe={cafe} showActions={showActions} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>
}

export default async function AdminCafesPage({ searchParams }: PageProps) {
  const { q, page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)

  let result: Awaited<ReturnType<typeof getCafes>>
  try {
    result = await getCafes({ q, page })
  } catch {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-100">
        <p className="display-md text-brand-900">Access denied</p>
      </div>
    )
  }

  const { items: cafes, total } = result

  // When not searching, pin pending approvals at the top outside pagination
  // so urgent items are always visible regardless of page
  const isFiltered = Boolean(q)
  const pending  = !isFiltered ? cafes.filter((c) => c.status === 'pending') : []
  const rest     = !isFiltered ? cafes.filter((c) => c.status !== 'pending') : cafes

  return (
    <div className="min-h-screen bg-cream-100 pb-16">
      <RealtimeRefresh table="cafes" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <PageMasthead
          eyebrow="Accounts"
          title="Cafés"
          description={`${total} total`}
          action={
            <Suspense>
              <SearchInput placeholder="Search name, phone, neighborhood…" />
            </Suspense>
          }
        />

        <div className="pt-6">
          {cafes.length === 0 ? (
            <div className="rounded-xl border border-cream-300 bg-white px-8 py-16 text-center">
              <p className="display-md text-brand-900">
                {q ? 'No matching cafés' : 'No applications yet'}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                {q ? `Nothing matches \u201c${q}\u201d.` : 'New café applications will appear here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pending section — always shown when not searching, regardless of page */}
              {pending.length > 0 && (
                <section className="overflow-hidden rounded-xl border border-brand-400 bg-white">
                  <div className="flex items-baseline justify-between gap-3 border-b border-brand-300 bg-brand-50 px-5 py-3.5">
                    <h2 className="display-sm text-brand-900">Pending Approval</h2>
                    <span className="eyebrow-sm text-brand-600">{pending.length}</span>
                  </div>
                  <CafeTable cafes={pending} showActions={true} />
                </section>
              )}

              {/* All cafés (or search results) with pagination */}
              {rest.length > 0 && (
                <section className="overflow-hidden rounded-xl border border-cream-300 bg-white">
                  {!isFiltered && (
                    <div className="border-b border-cream-300 bg-cream-100 px-5 py-3.5">
                      <h2 className="display-sm text-brand-900">All Cafés</h2>
                    </div>
                  )}
                  <CafeTable cafes={rest} showActions={isFiltered} />
                </section>
              )}
            </div>
          )}
        </div>

        <Pagination
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          basePath="/admin/cafes"
          q={q}
        />
      </div>
    </div>
  )
}
