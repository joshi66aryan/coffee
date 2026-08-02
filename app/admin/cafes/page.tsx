import { Suspense } from 'react'
import { getCafes } from '@/lib/admin/actions'
import { PAGE_SIZE } from '@/lib/admin/constants'
import { CafeApprovalActions } from '@/components/admin/cafe-approval-actions'
import { CafesRealtime } from '@/components/admin/cafes-realtime'
import { SearchInput } from '@/components/admin/search-input'
import { Pagination } from '@/components/admin/pagination'
import type { Cafe, CafeStatus } from '@/lib/types'

export const metadata = { title: 'Cafés — Admin' }

const STATUS_LABEL: Record<CafeStatus, string> = {
  pending:  'Pending',
  active:   'Active',
  rejected: 'Rejected',
}

const STATUS_CLASS: Record<CafeStatus, string> = {
  pending:  'bg-yellow-100 text-yellow-800',
  active:   'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

function CafeRow({ cafe, showActions }: { cafe: Cafe; showActions: boolean }) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-3 pr-4">
        <p className="font-medium text-gray-900">{cafe.name}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{cafe.delivery_address}</p>
      </td>
      <td className="py-3 pr-4 text-sm text-gray-600">{cafe.contact_name}</td>
      <td className="py-3 pr-4 text-sm text-gray-600 tabular-nums">{cafe.phone}</td>
      <td className="py-3 pr-4 text-sm text-gray-600">{cafe.neighborhood}</td>
      <td className="py-3 pr-4">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_CLASS[cafe.status]}`}>
          {STATUS_LABEL[cafe.status]}
        </span>
      </td>
      <td className="py-3 pr-4 text-xs text-gray-400 tabular-nums whitespace-nowrap">
        {new Date(cafe.created_at).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </td>
      <td className="py-3 text-right">
        {showActions && cafe.status === 'pending' && (
          <CafeApprovalActions cafeId={cafe.id} />
        )}
      </td>
    </tr>
  )
}

function CafeTable({ cafes, showActions }: { cafes: Cafe[]; showActions: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-175">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Café</th>
            <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Contact</th>
            <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Phone</th>
            <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Neighborhood</th>
            <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
            <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Applied</th>
            <th className="py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Actions</th>
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Access denied.</p>
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
    <div className="min-h-screen bg-gray-50 py-8">
      <CafesRealtime />
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cafés</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} total</p>
          </div>
          <Suspense>
            <SearchInput placeholder="Search name, phone, neighborhood…" />
          </Suspense>
        </div>

        {cafes.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">
              {q ? `No cafés match "${q}".` : 'No café applications yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pending section — always shown when not searching, regardless of page */}
            {pending.length > 0 && (
              <section className="bg-white rounded-xl border border-amber-200 overflow-hidden">
                <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
                  <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                    Pending Approval ({pending.length})
                  </h2>
                </div>
                <div className="px-5">
                  <CafeTable cafes={pending} showActions={true} />
                </div>
              </section>
            )}

            {/* All cafés (or search results) with pagination */}
            {rest.length > 0 && (
              <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {!isFiltered && (
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      All Cafés
                    </h2>
                  </div>
                )}
                <div className="px-5">
                  <CafeTable cafes={rest} showActions={isFiltered} />
                </div>
              </section>
            )}
          </div>
        )}

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
