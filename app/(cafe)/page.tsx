import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CatalogClient } from '@/components/cafe/catalog-client'
import { CafeHeader } from '@/components/cafe/cafe-header'
import { CatalogHero } from '@/components/cafe/catalog-hero'
import { RepeatLastOrderCard } from '@/components/cafe/repeat-last-order-card'
import { NotificationPromptBanner } from '@/components/cafe/notification-prompt-banner'
import { InstallPromptBanner } from '@/components/ui/install-prompt-banner'
import { RealtimeRefresh } from '@/components/ui/realtime-refresh'
import { getPushSubscriptionStatus } from '@/lib/push/actions'
import { groupItemsByOrder, type OrderItemPreviewRow } from '@/lib/cafe/order-preview'
import type { Product, CafeProductPrice, Cafe, CatalogProduct, Order } from '@/lib/types'
import logger from '@/lib/logger'

export const metadata = { title: 'Shop — Sherpa Sips' }

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [cafeResult, productsResult, pricesResult, lastOrderResult, pushStatus] = await Promise.all([
    supabase.from('cafes').select('*').eq('id', user.id).single<Cafe>(),
    supabase.from('products').select('*').order('category').order('name'),
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

  if (productsResult.error) {
    logger.error('Failed to fetch catalog', { userId: user.id, msg: productsResult.error.message })
  }

  const products = (productsResult.data ?? []) as Product[]
  const overrideMap = new Map(
    ((pricesResult.data ?? []) as CafeProductPrice[]).map(p => [p.product_id, p.custom_price])
  )

  const catalogProducts: CatalogProduct[] = products.map(p => ({
    ...p,
    effective_price: overrideMap.get(p.id) ?? p.base_price,
  }))

  const cafe = cafeResult.data
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
      <CafeHeader cafeName={cafe?.name} />
      <NotificationPromptBanner initialSubscribed={pushStatus.subscribed} />
      <InstallPromptBanner />

      <CatalogHero cafeName={cafe?.name} />

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
