import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CafeHeader } from '@/components/cafe/cafe-header'
import { CartSection } from '@/components/cafe/cart-section'
import { CartEmptyState } from '@/components/cafe/cart-empty-state'
import { PageMasthead } from '@/components/ui/page-masthead'
import { isProfileComplete } from '@/lib/cafe/cart'
import type { Cafe } from '@/lib/types'
import logger from '@/lib/logger'

export const metadata = { title: 'Cart — Sherpa Sips' }

export default async function CartPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: cafe, error } = await supabase
    .from('cafes')
    .select('credit_enabled, phone, delivery_address')
    .eq('id', user.id)
    .single<Pick<Cafe, 'credit_enabled' | 'phone' | 'delivery_address'>>()

  if (error) {
    logger.error('Failed to fetch café for cart page', { userId: user.id, msg: error.message })
  }

  const creditEnabled = cafe?.credit_enabled ?? false
  const profileComplete = cafe ? isProfileComplete(cafe) : false

  return (
    <main className="min-h-screen bg-cream-100 pb-24 sm:pb-12">
      <CafeHeader />

      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <PageMasthead
          eyebrow="Your basket"
          title="Cart"
          description="Review quantities and payment before sending your order to the roastery."
          backHref="/"
          backLabel="Keep shopping"
        />

        <div className="space-y-4 pt-6">
          {/* Cart — client-side, hides itself when empty */}
          <CartSection creditEnabled={creditEnabled} profileComplete={profileComplete} />
          <CartEmptyState />
        </div>
      </div>
    </main>
  )
}
