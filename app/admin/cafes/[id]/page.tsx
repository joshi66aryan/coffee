import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCafe, getCafeCompletedOrderCount, getCafeProductPricing } from '@/lib/admin/actions'
import { CafeCreditToggle } from '@/components/admin/cafe-credit-toggle'
import { CafePricingTable } from '@/components/admin/cafe-pricing-table'
import { CreditEligibilityBadge } from '@/components/admin/credit-eligibility-badge'
import type { CafeStatus } from '@/lib/types'

export const metadata = { title: 'Café Details — Admin' }

const STATUS_LABEL: Record<CafeStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  rejected: 'Rejected',
}

const STATUS_CLASS: Record<CafeStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminCafeDetailPage({ params }: Props) {
  const { id } = await params

  let cafe: Awaited<ReturnType<typeof getCafe>>
  let pricing: Awaited<ReturnType<typeof getCafeProductPricing>>
  let completedOrders: number
  try {
    ;[cafe, pricing, completedOrders] = await Promise.all([
      getCafe(id),
      getCafeProductPricing(id),
      getCafeCompletedOrderCount(id),
    ])
  } catch {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Access denied.</p>
      </div>
    )
  }

  if (!cafe) notFound()

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/admin/cafes" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← Cafés
          </Link>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{cafe.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {cafe.contact_name} · {cafe.phone}
            </p>
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_CLASS[cafe.status]}`}>
            {STATUS_LABEL[cafe.status]}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Café Info</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-400">Neighborhood</dt>
              <dd className="text-gray-900 mt-0.5">{cafe.neighborhood}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Delivery Address</dt>
              <dd className="text-gray-900 mt-0.5">{cafe.delivery_address}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Credit</h2>
            <CreditEligibilityBadge completedOrders={completedOrders} />
          </div>
          <CafeCreditToggle cafeId={cafe.id} enabled={cafe.credit_enabled} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Per-Café Pricing</h2>
          </div>
          <div className="px-5">
            <CafePricingTable cafeId={cafe.id} rows={pricing} />
          </div>
        </div>
      </div>
    </div>
  )
}
