import { notFound } from 'next/navigation'
import { getCafe, getCafeCompletedOrderCount, getCafeProductPricing } from '@/lib/admin/actions'
import { CafeCreditToggle } from '@/components/admin/cafe-credit-toggle'
import { CafePricingTable } from '@/components/admin/cafe-pricing-table'
import { CreditEligibilityBadge } from '@/components/admin/credit-eligibility-badge'
import { PageMasthead } from '@/components/ui/page-masthead'
import type { CafeStatus } from '@/lib/types'

export const metadata = { title: 'Café Details — Admin' }

const STATUS_LABEL: Record<CafeStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  rejected: 'Rejected',
}

const STATUS_CLASS: Record<CafeStatus, string> = {
  pending: 'bg-brand-400 text-brand-950',
  active: 'bg-olive-600 text-cream-100',
  rejected: 'bg-cream-300 text-brand-900',
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
      <div className="flex min-h-screen items-center justify-center bg-cream-100">
        <p className="display-md text-brand-900">Access denied</p>
      </div>
    )
  }

  if (!cafe) notFound()

  return (
    <div className="min-h-screen bg-cream-100 pb-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <PageMasthead
          eyebrow={`${cafe.contact_name} · ${cafe.phone}`}
          title={cafe.name}
          backHref="/admin/cafes"
          backLabel="Cafés"
          action={
            <span className={`pill ${STATUS_CLASS[cafe.status]}`}>{STATUS_LABEL[cafe.status]}</span>
          }
        />

        <div className="space-y-5 pt-6">
          <section className="rounded-xl border border-cream-300 bg-white p-5">
            <h2 className="eyebrow mb-4">Café Info</h2>
            <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <dt className="eyebrow-sm text-gray-400">Neighborhood</dt>
                <dd className="mt-2 text-sm text-brand-900">{cafe.neighborhood}</dd>
              </div>
              <div>
                <dt className="eyebrow-sm text-gray-400">Delivery Address</dt>
                <dd className="mt-2 text-sm text-brand-900">{cafe.delivery_address}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-cream-300 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="eyebrow">Credit</h2>
              <CreditEligibilityBadge completedOrders={completedOrders} />
            </div>
            <CafeCreditToggle cafeId={cafe.id} enabled={cafe.credit_enabled} />
          </section>

          <section className="overflow-hidden rounded-xl border border-cream-300 bg-white">
            <div className="border-b border-cream-300 bg-cream-100 px-5 py-3.5">
              <h2 className="display-sm text-brand-900">Per-Café Pricing</h2>
            </div>
            <CafePricingTable cafeId={cafe.id} rows={pricing} />
          </section>
        </div>
      </div>
    </div>
  )
}
