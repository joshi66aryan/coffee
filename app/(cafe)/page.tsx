import { createClient } from '@/lib/supabase/server'
import { getCachedUser } from '@/lib/supabase/user'
import { redirect } from 'next/navigation'
import { CatalogClient } from '@/components/cafe/catalog-client'
import { CafeHeader } from '@/components/cafe/cafe-header'
import { CatalogHero } from '@/components/cafe/catalog-hero'
import { RepeatLastOrderCard } from '@/components/cafe/repeat-last-order-card'
import { NotificationPromptBanner } from '@/components/cafe/notification-prompt-banner'
import { InstallPromptBanner } from '@/components/ui/install-prompt-banner'
import { RealtimeRefresh } from '@/components/ui/realtime-refresh'
import { getPushSubscriptionStatus } from '@/lib/push/status'
import { groupItemsByOrder, type OrderItemPreviewRow } from '@/lib/cafe/order-preview'
import { getCatalogProducts } from '@/lib/cafe/catalog-cache'
import { requireActiveCafe } from '@/lib/cafe/require-cafe'
import type { CafeProductPrice, CatalogProduct, Order } from '@/lib/types'
import logger from '@/lib/logger'

export const metadata = { title: 'Shop — Sherpa Sips' }

export default async function HomePage() {
  const supabase = await createClient()
  const { user } = await getCachedUser()
  if (!user) redirect('/login')

  const [{ cafe }, products, pricesResult, lastOrderResult, pushStatus] = await Promise.all([
    // The status gate and the café row in one query — middleware used to run
    // this on every request, before the render even started.
    requireActiveCafe(),
    // Shared across every café, so it comes from the cross-request cache
    // rather than a per-render query. See lib/cafe/catalog-cache.ts.
    getCatalogProducts(supabase),
    supabase.from('cafe_product_prices').select('*').eq('cafe_id', user.id),
    supabase
      .from('orders')
      .select('*')
      .eq('cafe_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .returns<Order[]>(),
    getPushSubscriptionStatus(),
  ])

  const overrideMap = new Map(
    ((pricesResult.data ?? []) as CafeProductPrice[]).map(p => [p.product_id, p.custom_price])
  )

  const catalogProducts: CatalogProduct[] = products.map(p => ({
    ...p,
    effective_price: overrideMap.get(p.id) ?? p.base_price,
  }))

  const categories = [...new Set(products.map(p => p.category))]

  const lastOrder = lastOrderResult.data?.[0]
  let lastOrderItems: ReturnType<typeof groupItemsByOrder>[string] = []
  if (lastOrder) {
    const { data: itemRows, error: itemsError } = await supabase
      .from('order_items')
      .select('order_id, product_id, quantity, products(name, image_url)')
      .eq('order_id', lastOrder.id)
      .returns<OrderItemPreviewRow[]>()

    if (itemsError) {
      logger.error('Failed to fetch last order item preview', { userId: user.id, msg: itemsError.message })
    }
    lastOrderItems = groupItemsByOrder(itemRows ?? [])[lastOrder.id] ?? []
  }

  return (
    <main className="min-h-screen bg-cream-100 pb-20 sm:pb-8">
      <RealtimeRefresh table="products" />
      <CafeHeader cafeName={cafe.name} />
      <NotificationPromptBanner initialSubscribed={pushStatus.subscribed} />
      <InstallPromptBanner />

      <CatalogHero cafeName={cafe.name} />

      {lastOrder && lastOrderItems.length > 0 && (
        <RepeatLastOrderCard
          shortId={lastOrder.id.split('-')[0].toUpperCase()}
          total={lastOrder.total_amount}
          items={lastOrderItems}
        />
      )}

      <CatalogClient products={catalogProducts} categories={categories} />
    </main>
  )
}
