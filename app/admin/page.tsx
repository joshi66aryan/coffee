import Link from 'next/link'
import { DollarSign, ShoppingCart, Clock, CircleDollarSign, Store, ArrowRight } from 'lucide-react'
import { getDashboardStats } from '@/lib/admin/actions'
import { StatCard } from '@/components/admin/stat-card'
import { TopProductsTable } from '@/components/admin/top-products-table'
import { TopProductsChart } from '@/components/admin/top-products-chart'
import { SalesTrendChart } from '@/components/admin/sales-trend-chart'
import { OrderStatusChart } from '@/components/admin/order-status-chart'
import { NotificationPromptBanner } from '@/components/admin/notification-prompt-banner'
import { RealtimeRefresh } from '@/components/ui/realtime-refresh'
import { getPushSubscriptionStatus } from '@/lib/push/actions'

export const metadata = { title: 'Dashboard — Admin' }

function formatAmount(amount: number) {
  return amount.toLocaleString('en-IN')
}

export default async function AdminDashboardPage() {
  let stats: Awaited<ReturnType<typeof getDashboardStats>>
  try {
    stats = await getDashboardStats()
  } catch {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-100">
        <p className="display-md text-brand-900">Access denied</p>
      </div>
    )
  }

  const { subscribed } = await getPushSubscriptionStatus()

  return (
    <div className="min-h-screen bg-cream-100 pb-16">
      <RealtimeRefresh table={['orders', 'cafes']} />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* ---- Masthead --------------------------------------------------- */}
        <header className="border-b border-cream-300 py-8 sm:py-10">
          <p className="eyebrow">Operations</p>
          <h1 className="display-lg mt-3 text-brand-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-500">Overview across all cafés</p>
        </header>

        <div className="pt-6">
          <NotificationPromptBanner initialSubscribed={subscribed} />
        </div>

        {stats.pendingCafes > 0 && (
          <Link
            href="/admin/cafes"
            className="group mb-6 flex items-center justify-between gap-4 rounded-lg border-l-4 border-brand-400 bg-brand-50 px-5 py-4 transition-colors hover:bg-brand-100"
          >
            <span className="font-display text-base uppercase tracking-[0.08em] text-brand-800">
              {stats.pendingCafes} café {stats.pendingCafes === 1 ? 'application' : 'applications'} awaiting approval
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-brand-700 transition-transform group-hover:translate-x-1" />
          </Link>
        )}

        {/* ---- Statistics -------------------------------------------------- */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          <StatCard label="Total Sales" prefix="Rs." value={formatAmount(stats.totalSales)} href="/admin/orders" icon={DollarSign} />
          <StatCard label="Total Orders" value={String(stats.totalOrders)} href="/admin/orders" icon={ShoppingCart} />
          <StatCard label="Active Orders" value={String(stats.activeOrders)} href="/admin/orders" icon={Clock} />
          <StatCard label="Outstanding" prefix="Rs." value={formatAmount(stats.outstandingTotal)} href="/admin/payments" icon={CircleDollarSign} />
          <StatCard label="Active Cafés" value={String(stats.activeCafes)} href="/admin/cafes" icon={Store} />
        </div>

        {/* ---- Sales trend -------------------------------------------------- */}
        <section className="mb-6 overflow-hidden rounded-xl border border-cream-300 bg-white">
          <div className="flex items-baseline justify-between gap-3 border-b border-cream-300 bg-cream-100 px-5 py-3.5">
            <h2 className="display-sm text-brand-900">Sales Trend</h2>
            <span className="eyebrow-sm text-gray-400">Last 30 Days</span>
          </div>
          <div className="px-5 py-5">
            <SalesTrendChart data={stats.salesTrend} />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="overflow-hidden rounded-xl border border-cream-300 bg-white">
            <div className="border-b border-cream-300 bg-cream-100 px-5 py-3.5">
              <h2 className="display-sm text-brand-900">Orders by Status</h2>
            </div>
            <div className="px-5 py-5">
              <OrderStatusChart counts={stats.statusCounts} />
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-cream-300 bg-white">
            <div className="border-b border-cream-300 bg-cream-100 px-5 py-3.5">
              <h2 className="display-sm text-brand-900">Top Selling Products</h2>
            </div>
            <div className="px-5 py-5">
              <TopProductsChart products={stats.topProducts} />
            </div>
            <div className="border-t border-cream-300 px-5">
              <TopProductsTable products={stats.topProducts} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
