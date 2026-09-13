'use server'

import { z } from 'zod'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCachedUser } from '@/lib/supabase/user'
import logger from '@/lib/logger'
import { consumeRateLimit, retryAfterMessage } from '@/lib/rate-limit'
import { generateInvoiceForOrder } from '@/lib/invoice/generate'
import { INVOICE_SIGNED_URL_TTL_SECONDS } from '@/lib/invoice/storage'
import { sendPushToAdmins } from '@/lib/push/send'
import type { Product, CafeProductPrice, PaymentType, InvoiceDownload } from '@/lib/types'

// Upper bounds on what one order may contain. The schema previously bounded
// quantity only from below (`positive()`), so a hand-crafted request could ask
// for 2^31 units across an unbounded number of lines — which fans out into an
// unbounded `in (...)` lookup and can push total_amount past the column's
// numeric(10,2) range, turning a rejected order into a raw database error.
// These ceilings sit far above any real wholesale order.
const MAX_LINE_QUANTITY = 10_000
const MAX_ORDER_LINES = 100
// numeric(10,2) tops out at 99,999,999.99 — stop short of it with a message
// the café can act on rather than letting the insert fail.
const MAX_ORDER_TOTAL = 10_000_000

const OrderItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive().max(MAX_LINE_QUANTITY, 'Quantity is too large'),
})

const PlaceOrderSchema = z.object({
  items: z
    .array(OrderItemSchema)
    .min(1, 'Order must have at least one item')
    .max(MAX_ORDER_LINES, 'Order has too many line items'),
  payment_type: z.enum(['cash', 'credit']),
})

function computeDeliveryDate(): string {
  const nepalOffsetMs = (5 * 60 + 45) * 60 * 1000
  const nowNepal = new Date(Date.now() + nepalOffsetMs)
  const hourNepal = nowNepal.getUTCHours()
  const daysToAdd = hourNepal >= 18 ? 2 : 1
  const deliveryNepal = new Date(Date.now() + nepalOffsetMs + daysToAdd * 24 * 60 * 60 * 1000)
  const y = deliveryNepal.getUTCFullYear()
  const m = String(deliveryNepal.getUTCMonth() + 1).padStart(2, '0')
  const d = String(deliveryNepal.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export async function placeOrder(input: {
  items: { product_id: string; quantity: number }[]
  payment_type: PaymentType
}): Promise<{ orderId: string } | { error: string }> {
  const parsed = PlaceOrderSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { user, error: authError } = await getCachedUser()
  if (authError || !user) return { error: 'Not authenticated' }

  // Placing an order fans out into an invoice render, a storage upload and a
  // push to every admin device — all after the response, so a script hammering
  // this action costs far more than the request it pays for.
  const limit = await consumeRateLimit('placeOrder', user.id)
  if (!limit.allowed) {
    return { error: `Too many orders placed just now. ${retryAfterMessage(limit.retryAfter)}` }
  }

  const { data: cafe, error: cafeError } = await supabase
    .from('cafes')
    .select('name, status, credit_enabled, phone, delivery_address')
    .eq('id', user.id)
    .single()

  if (cafeError || !cafe) return { error: 'Café profile not found' }
  if (cafe.status !== 'active') return { error: 'Your account is not active' }
  if (!cafe.phone.trim() || !cafe.delivery_address.trim()) {
    return { error: 'Please add your phone number and delivery address in Account Settings before placing an order.' }
  }
  if (parsed.data.payment_type === 'credit' && !cafe.credit_enabled) {
    return { error: 'Credit is not available for your account yet' }
  }

  const productIds = parsed.data.items.map(i => i.product_id)

  const [productsResult, pricesResult] = await Promise.all([
    supabase.from('products').select('*').is('archived_at', null).in('id', productIds),
    supabase.from('cafe_product_prices').select('*').eq('cafe_id', user.id).in('product_id', productIds),
  ])

  if (productsResult.error) {
    logger.error('Failed to fetch products for order', { userId: user.id, msg: productsResult.error.message })
    return { error: 'Failed to validate order. Please try again.' }
  }

  const products = productsResult.data as Product[]
  const productMap = new Map(products.map(p => [p.id, p]))
  const overrideMap = new Map(
    ((pricesResult.data ?? []) as CafeProductPrice[]).map(p => [p.product_id, p.custom_price])
  )

  for (const item of parsed.data.items) {
    const product = productMap.get(item.product_id)
    if (!product) return { error: 'One or more products not found' }
    if (product.stock_status === 'out_of_stock') {
      return { error: `"${product.name}" is currently out of stock` }
    }
  }

  let total_amount = 0
  const orderItems = parsed.data.items.map(item => {
    const product = productMap.get(item.product_id)!
    const unit_price = overrideMap.get(item.product_id) ?? product.base_price
    total_amount += unit_price * item.quantity
    return { product_id: item.product_id, quantity: item.quantity, unit_price_at_time_of_order: unit_price }
  })

  if (total_amount > MAX_ORDER_TOTAL) {
    return { error: 'Order total is too large. Please split it into smaller orders.' }
  }

  // The order row and its line items are written by one SECURITY DEFINER
  // function, in one transaction, through the service-role client.
  //
  // Two things this replaces. The café session used to do both inserts itself,
  // which meant `order_items` needed an INSERT policy — and that policy could
  // only ask "does the parent order belong to you?", with no time bound and no
  // price bound. A café could therefore keep appending lines to an order it
  // placed last week at a unit price of zero, while `total_amount` (which is
  // not café-writable) stayed where this function put it. Migration 013 removes
  // the café's INSERT grant on both tables entirely, so that door is gone
  // rather than narrowed.
  //
  // It was also two separate round trips, so a failure between them left an
  // order with a total and no lines — a state this code could only apologise
  // for. One call is one transaction.
  //
  // Everything the function is told has been established above, not accepted
  // from the client: the café id is the authenticated user's, the status and
  // credit checks have run, and every unit price was resolved server-side from
  // products/cafe_product_prices.
  const admin = createAdminClient()
  const { data: orderId, error: orderError } = await admin.rpc('create_order_with_items', {
    p_cafe_id: user.id,
    p_payment_type: parsed.data.payment_type,
    p_delivery_date: computeDeliveryDate(),
    p_total_amount: total_amount,
    p_items: orderItems,
  })

  if (orderError || !orderId) {
    logger.error('Failed to create order', { userId: user.id, msg: orderError?.message })
    return { error: 'Failed to place order. Please try again.' }
  }

  const order = { id: orderId as string }

  logger.info('Order placed', { userId: user.id, orderId: order.id, total: total_amount, items: orderItems.length })

  // Invoice generation (PDF render + storage upload) runs after the response
  // is sent — the confirmation page doesn't need it, and it must never stall
  // the "place order" click itself. The order detail page already renders
  // fine before invoice_number is set; the invoice row just appears once
  // this finishes.
  after(async () => {
    try {
      const result = await generateInvoiceForOrder(order.id)
      if ('error' in result) {
        logger.error('Invoice generation failed after order placement', { orderId: order.id, msg: result.error })
      }
    } catch (err) {
      logger.error('Invoice generation threw after order placement', {
        orderId: order.id,
        msg: err instanceof Error ? err.message : String(err),
      })
    }
  })

  // Notifying admins runs after the response is sent — a slow or hanging
  // push service must never stall the "place order" click itself.
  after(async () => {
    try {
      await sendPushToAdmins({
        title: 'New order received',
        body: `${cafe.name} placed an order — Rs. ${total_amount.toLocaleString('en-IN')}`,
        url: `/admin/orders/${order.id}`,
      })
    } catch (err) {
      logger.error('Failed to notify admins of new order', {
        orderId: order.id,
        msg: err instanceof Error ? err.message : String(err),
      })
    }
  })

  return { orderId: order.id }
}

export async function getInvoiceDownloadUrl(orderId: string): Promise<InvoiceDownload | null> {
  const supabase = await createClient()
  const { user } = await getCachedUser()
  if (!user) return null

  // Scoped to the caller's own café explicitly, via an inner join on the
  // parent order, rather than leaving `invoices_select_own` as the only thing
  // standing between an guessed order id and someone else's invoice. Same
  // single round trip as before — the join is what the RLS policy's EXISTS
  // subquery was already doing — so this costs nothing and means an RLS
  // regression can't silently become an IDOR.
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('invoice_number, pdf_path, orders!inner(cafe_id)')
    .eq('order_id', orderId)
    .eq('orders.cafe_id', user.id)
    .single<{ invoice_number: string; pdf_path: string }>()

  if (error || !invoice) {
    // PGRST116 = no matching row — expected when an invoice hasn't been generated yet.
    if (error && error.code !== 'PGRST116') {
      logger.error('Failed to fetch invoice', { userId: user.id, orderId, msg: error.message })
    }
    return null
  }

  const { data: signed, error: signError } = await supabase.storage
    .from('invoices')
    .createSignedUrl(invoice.pdf_path, INVOICE_SIGNED_URL_TTL_SECONDS)

  if (signError || !signed) {
    logger.error('Failed to create invoice download URL', {
      userId: user.id,
      orderId,
      msg: signError?.message,
    })
    return null
  }

  return { invoiceNumber: invoice.invoice_number, downloadUrl: signed.signedUrl }
}
