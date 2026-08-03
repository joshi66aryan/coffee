import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { OrderReviewClient, type ReviewItem } from '@/components/cafe/order-review-client'
import type { Product, CafeProductPrice } from '@/lib/types'
import logger from '@/lib/logger'

export const metadata = { title: 'Review Order — Sherpa Sips' }

function parseCart(cartParam: string): { productId: string; quantity: number }[] {
  try {
    return cartParam
      .split(',')
      .map(entry => {
        const [id, qty] = entry.split(':')
        return { productId: id?.trim(), quantity: parseInt(qty, 10) }
      })
      .filter(e => e.productId && e.quantity > 0)
  } catch {
    return []
  }
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ cart?: string }>
}) {
  const { cart: cartParam } = await searchParams
  if (!cartParam) redirect('/catalog')

  const cartEntries = parseCart(cartParam)
  if (cartEntries.length === 0) redirect('/catalog')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const productIds = cartEntries.map(e => e.productId)

  const [productsResult, pricesResult, cafeResult] = await Promise.all([
    supabase.from('products').select('*').in('id', productIds),
    supabase.from('cafe_product_prices').select('*').eq('cafe_id', user.id).in('product_id', productIds),
    supabase.from('cafes').select('credit_enabled').eq('id', user.id).single(),
  ])

  if (productsResult.error) {
    logger.error('Failed to fetch products for review', { userId: user.id, msg: productsResult.error.message })
    redirect('/catalog')
  }

  const products = productsResult.data as Product[]
  const overrideMap = new Map(
    ((pricesResult.data ?? []) as CafeProductPrice[]).map(p => [p.product_id, p.custom_price])
  )
  const productMap = new Map(products.map(p => [p.id, p]))
  const creditEnabled = cafeResult.data?.credit_enabled ?? false

  const reviewItems: ReviewItem[] = cartEntries
    .flatMap(entry => {
      const product = productMap.get(entry.productId)
      if (!product) return []
      return [{
        product_id: entry.productId,
        name: product.name,
        unit: product.unit,
        quantity: entry.quantity,
        unit_price: overrideMap.get(entry.productId) ?? product.base_price,
        stock_status: product.stock_status,
      }]
    })

  if (reviewItems.length === 0) redirect('/catalog')

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <Link
          href="/"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-bold text-gray-900">Review Order</h1>
      </header>

      <OrderReviewClient initialItems={reviewItems} creditEnabled={creditEnabled} />
    </main>
  )
}
