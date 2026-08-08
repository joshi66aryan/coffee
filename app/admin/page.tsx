import Link from 'next/link'
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

function formatPrice(amount: number) {
  return `Rs. ${amount.toLocaleString('en-IN')}`
}

export default async function AdminDashboardPage() {
  let stats: Awaited<ReturnType<typeof getDashboardStats>>
  try {
    stats = await getDashboardStats()
  } catch {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Access denied.</p>
      </div>
    )
  }

  const { subscribed } = await getPushSubscriptionStatus()

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <RealtimeRefresh table={['orders', 'cafes']} />
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview across all cafés</p>
        </div>

        <NotificationPromptBanner initialSubscribed={subscribed} />

        {stats.pendingCafes > 0 && (
          <Link
            href="/admin/cafes"
            className="block bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-6 hover:bg-amber-100 transition-colors"
          >
            <span className="text-sm font-semibold text-amber-700">
              {stats.pendingCafes} café {stats.pendingCafes === 1 ? 'application' : 'applications'} awaiting approval →
            </span>
          </Link>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <StatCard label="Total Sales" value={formatPrice(stats.totalSales)} href="/admin/orders" />
          <StatCard label="Total Orders" value={String(stats.totalOrders)} href="/admin/orders" />
          <StatCard label="Active Orders" value={String(stats.activeOrders)} href="/admin/orders" />
          <StatCard label="Outstanding Payments" value={formatPrice(stats.outstandingTotal)} href="/admin/payments" />
          <StatCard label="Active Cafés" value={String(stats.activeCafes)} href="/admin/cafes" />
        </div>

        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Sales Trend — Last 30 Days</h2>
          </div>
          <div className="px-5 py-4">
            <SalesTrendChart data={stats.salesTrend} />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Orders by Status</h2>
            </div>
            <div className="px-5 py-4">
              <OrderStatusChart counts={stats.statusCounts} />
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Top Selling Products</h2>
            </div>
            <div className="px-5 py-4">
              <TopProductsChart products={stats.topProducts} />
            </div>
            <div className="px-5 border-t border-gray-100">
              <TopProductsTable products={stats.topProducts} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
