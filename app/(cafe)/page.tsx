import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CatalogClient } from '@/components/cafe/catalog-client'
import { CafeHeader } from '@/components/cafe/cafe-header'
import type { Product, CafeProductPrice, Cafe, CatalogProduct } from '@/lib/types'
import logger from '@/lib/logger'

export const metadata = { title: 'Shop — Sherpa Sips' }

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [cafeResult, productsResult, pricesResult] = await Promise.all([
    supabase.from('cafes').select('*').eq('id', user.id).single<Cafe>(),
    supabase.from('products').select('*').order('category').order('name'),
    supabase.from('cafe_product_prices').select('*').eq('cafe_id', user.id),
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

  return (
    <main className="min-h-screen bg-gray-50 pb-20 sm:pb-4">
      <CafeHeader cafeName={cafe?.name} />
      <CatalogClient products={catalogProducts} categories={categories} />
    </main>
  )
}
