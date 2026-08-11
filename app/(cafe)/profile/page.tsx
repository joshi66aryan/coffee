import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { CafeHeader } from '@/components/cafe/cafe-header'
import { ProfileHeaderCard } from '@/components/cafe/profile-header-card'
import { ProfileQuickNav } from '@/components/cafe/profile-quick-nav'
import { PageMasthead } from '@/components/ui/page-masthead'
import { ContactSupportRow } from '@/components/cafe/contact-support-row'
import { RepeatLastOrderCard } from '@/components/cafe/repeat-last-order-card'
import { OutstandingBillsCard } from '@/components/cafe/outstanding-bills-card'
import { groupItemsByOrder, type OrderItemPreviewRow } from '@/lib/cafe/order-preview'
import { summarizeOutstandingBills } from '@/lib/cafe/outstanding-bills'
import type { Cafe, Order } from '@/lib/types'
import logger from '@/lib/logger'

export const metadata = { title: 'Account — Sherpa Sips' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [cafeResult, lastOrderResult, unpaidOrdersResult] = await Promise.all([
    supabase.from('cafes').select('*').eq('id', user.id).single<Cafe>(),
    supabase
      .from('orders')
      .select('*')
      .eq('cafe_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .returns<Order[]>(),
    supabase
      .from('orders')
      .select('total_amount')
      .eq('cafe_id', user.id)
      .in('payment_status', ['pending', 'due'])
      .returns<{ total_amount: number }[]>(),
  ])

  if (!cafeResult.data) {
    logger.error('Failed to load café for profile page', { userId: user.id, msg: cafeResult.error?.message })
    redirect('/')
  }

  if (unpaidOrdersResult.error) {
    logger.error('Failed to fetch outstanding bills', { userId: user.id, msg: unpaidOrdersResult.error.message })
  }

  const cafe = cafeResult.data
  const lastOrder = lastOrderResult.data?.[0]
  const outstanding = summarizeOutstandingBills(unpaidOrdersResult.data ?? [])

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
    <main className="min-h-screen bg-cream-100 pb-24 sm:pb-12">
      <CafeHeader cafeName={cafe.name} />

      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <PageMasthead
          eyebrow="Your café"
          title="Account"
          action={
            <Link
              href="/settings/app"
              aria-label="App settings"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-cream-300 bg-white text-gray-500 transition-colors hover:border-brand-600 hover:text-brand-900"
            >
              <Settings className="h-4 w-4" />
            </Link>
          }
        />

        <div className="space-y-5 pt-6">
          <ProfileQuickNav />

          <ProfileHeaderCard cafe={cafe} />

          {outstanding.count > 0 && (
            <OutstandingBillsCard count={outstanding.count} totalAmount={outstanding.totalAmount} />
          )}

          {lastOrder && lastOrderItems.length > 0 && (
            <div>
              <h2 className="eyebrow mb-2.5">Recent Order</h2>
              <RepeatLastOrderCard
                shortId={lastOrder.id.split('-')[0].toUpperCase()}
                total={lastOrder.total_amount}
                items={lastOrderItems}
                dismissible={false}
                showHeader={false}
              />
            </div>
          )}

          <ContactSupportRow />
        </div>
      </div>
    </main>
  )
}
