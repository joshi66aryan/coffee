'use server'

import { createClient } from '@/lib/supabase/server'
import logger from '@/lib/logger'
import type { Product, CafeProductPrice, CatalogProduct } from '@/lib/types'

export async function getCartProducts(productIds: string[]): Promise<CatalogProduct[]> {
  if (productIds.length === 0) return []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const [productsResult, pricesResult] = await Promise.all([
    supabase.from('products').select('*').in('id', productIds),
    supabase.from('cafe_product_prices').select('*').eq('cafe_id', user.id).in('product_id', productIds),
  ])

  if (productsResult.error) {
    logger.error('Failed to fetch cart products', { userId: user.id, msg: productsResult.error.message })
    return []
  }

  const products = productsResult.data as Product[]
  const overrideMap = new Map(
    ((pricesResult.data ?? []) as CafeProductPrice[]).map(p => [p.product_id, p.custom_price])
  )

  return products.map(p => ({
    ...p,
    effective_price: overrideMap.get(p.id) ?? p.base_price,
  }))
}

export async function getSubstituteProducts(
  categories: string[],
  excludeIds: string[]
): Promise<CatalogProduct[]> {
  if (categories.length === 0) return []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const [productsResult, pricesResult] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .in('category', categories)
      .eq('stock_status', 'in_stock')
      .order('name'),
    supabase.from('cafe_product_prices').select('*').eq('cafe_id', user.id),
  ])

  if (productsResult.error) {
    logger.error('Failed to fetch substitute products', { userId: user.id, msg: productsResult.error.message })
    return []
  }

  const products = (productsResult.data as Product[]).filter(p => !excludeIds.includes(p.id))
  const overrideMap = new Map(
    ((pricesResult.data ?? []) as CafeProductPrice[]).map(p => [p.product_id, p.custom_price])
  )

  return products.map(p => ({
    ...p,
    effective_price: overrideMap.get(p.id) ?? p.base_price,
  }))
}
