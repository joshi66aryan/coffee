import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Check } from 'lucide-react'
import { ClearCartOnMount } from '@/components/cafe/clear-cart-on-mount'
import { BeanScatter } from '@/components/brand/bean-scatter'
import type { Order } from '@/lib/types'
import logger from '@/lib/logger'

export const metadata = { title: 'Order Confirmed — Sherpa Sips' }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatDeliveryDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return `${WEEKDAYS[date.getUTCDay()]}, ${MONTHS[month - 1]} ${day}`
}

function formatPrice(amount: number) {
  return `Rs. ${amount.toLocaleString('en-IN')}`
}

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>
}) {
  const { orderId } = await searchParams
  if (!orderId) redirect('/')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('cafe_id', user.id)
    .single<Order>()

  if (error || !order) {
    logger.error('Order not found on confirm page', { userId: user.id, orderId, msg: error?.message })
    redirect('/')
  }

  const shortId = orderId.split('-')[0].toUpperCase()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream-100 px-4 py-14">
      <ClearCartOnMount />

      <div className="animate-rise w-full max-w-sm">
        {/* The order docket, arched like a pouch label. */}
        <article className="overflow-hidden rounded-t-[5rem] rounded-b-xl border border-cream-300 bg-white">
          <header className="relative overflow-hidden bg-brand-900 px-6 pb-7 pt-10 text-center">
            <BeanScatter className="text-cream-50/6" count={3} />

            <div className="relative">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-400 text-brand-950">
                <Check className="h-7 w-7" strokeWidth={3} aria-hidden="true" />
              </span>
              <h1 className="display-md mt-5 text-cream-50">Order placed</h1>
              <p className="mt-2.5 text-sm text-cream-200/70">
                We&apos;ve received it and will confirm shortly.
              </p>

              <div className="mt-7 border-t border-cream-200/20 pt-5">
                <p className="eyebrow-sm text-cream-200/50">Order ID</p>
                <p className="mt-2 font-display text-4xl leading-none tracking-wider text-brand-400">
                  {shortId}
                </p>
                <p className="mt-2.5 text-[11px] text-cream-200/50">
                  {new Date(order.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </header>

          <dl className="divide-y divide-cream-200">
            <div className="flex items-center justify-between px-5 py-3.5">
              <dt className="eyebrow-sm text-gray-400">Total</dt>
              <dd className="font-display text-xl leading-none text-brand-900 tabular-nums">
                {formatPrice(order.total_amount)}
              </dd>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <dt className="eyebrow-sm text-gray-400">Payment</dt>
              <dd>
                <span className={`pill ${
                  order.payment_type === 'cash'
                    ? 'bg-olive-600 text-cream-100'
                    : 'bg-brand-400 text-brand-950'
                }`}>
                  {order.payment_type === 'cash' ? 'Cash' : 'Credit'}
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <dt className="eyebrow-sm text-gray-400">Status</dt>
              <dd>
                <span className="pill bg-cream-200 text-brand-900">Received</span>
              </dd>
            </div>
            {order.delivery_date && (
              <div className="flex items-center justify-between px-5 py-3.5">
                <dt className="eyebrow-sm text-gray-400">Delivery</dt>
                <dd className="text-right">
                  <p className="font-display text-base leading-none text-brand-900">
                    {formatDeliveryDate(order.delivery_date)}
                  </p>
                  <p className="mt-1.5 text-[11px] text-gray-400">5–6 PM window</p>
                </dd>
              </div>
            )}
          </dl>
        </article>

        <div className="mt-4 space-y-2.5">
          <Link href={`/orders/${orderId}`} className="btn btn-primary btn-block btn-lg">
            Track order
          </Link>
          <Link href="/" className="btn btn-outline btn-block">
            Back to catalog
          </Link>
        </div>
      </div>
    </main>
  )
}
