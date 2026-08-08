import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CafeHeader } from '@/components/cafe/cafe-header'
import { CartSection } from '@/components/cafe/cart-section'
import { CartEmptyState } from '@/components/cafe/cart-empty-state'
import type { Cafe } from '@/lib/types'
import logger from '@/lib/logger'

export const metadata = { title: 'Cart — Sherpa Sips' }

export default async function CartPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: cafe, error } = await supabase
    .from('cafes')
    .select('credit_enabled')
    .eq('id', user.id)
    .single<Pick<Cafe, 'credit_enabled'>>()

  if (error) {
    logger.error('Failed to fetch café for cart page', { userId: user.id, msg: error.message })
  }

  const creditEnabled = cafe?.credit_enabled ?? false

  return (
    <main className="min-h-screen bg-gray-50 pb-20 sm:pb-4">
      <CafeHeader />

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Cart — client-side, hides itself when empty */}
        <CartSection creditEnabled={creditEnabled} />
        <CartEmptyState />
      </div>
    </main>
  )
}
