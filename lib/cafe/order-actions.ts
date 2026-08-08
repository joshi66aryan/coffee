'use server'

import { z } from 'zod'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import logger from '@/lib/logger'
import { generateInvoiceForOrder } from '@/lib/invoice/generate'
import { INVOICE_SIGNED_URL_TTL_SECONDS } from '@/lib/invoice/storage'
import { sendPushToAdmins } from '@/lib/push/send'
import type { Product, CafeProductPrice, PaymentType, InvoiceDownload } from '@/lib/types'

const OrderItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive(),
})

const PlaceOrderSchema = z.object({
  items: z.array(OrderItemSchema).min(1, 'Order must have at least one item'),
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
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  const { data: cafe, error: cafeError } = await supabase
    .from('cafes')
    .select('name, status, credit_enabled')
    .eq('id', user.id)
    .single()

  if (cafeError || !cafe) return { error: 'Café profile not found' }
  if (cafe.status !== 'active') return { error: 'Your account is not active' }
  if (parsed.data.payment_type === 'credit' && !cafe.credit_enabled) {
    return { error: 'Credit is not available for your account yet' }
  }

  const productIds = parsed.data.items.map(i => i.product_id)

  const [productsResult, pricesResult] = await Promise.all([
    supabase.from('products').select('*').in('id', productIds),
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

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      cafe_id: user.id,
      total_amount,
      payment_type: parsed.data.payment_type,
      payment_status: 'pending',
      delivery_date: computeDeliveryDate(),
    })
    .select('id')
    .single()

  if (orderError || !order) {
    logger.error('Failed to create order', { userId: user.id, msg: orderError?.message })
    return { error: 'Failed to place order. Please try again.' }
  }

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems.map(item => ({ ...item, order_id: order.id })))

  if (itemsError) {
    logger.error('Failed to insert order items', { orderId: order.id, msg: itemsError.message })
    return { error: 'Order created but items failed to save. Please contact support.' }
  }

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

export async function getLastOrder(): Promise<{
  cart: string
} | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: lastOrder } = await supabase
    .from('orders')
    .select('id')
    .eq('cafe_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!lastOrder) return null

  const { data: items } = await supabase
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', lastOrder.id)

  if (!items || items.length === 0) return null

  const cart = items.map(i => `${i.product_id}:${i.quantity}`).join(',')
  return { cart }
}

export async function getInvoiceDownloadUrl(orderId: string): Promise<InvoiceDownload | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('invoice_number, pdf_path')
    .eq('order_id', orderId)
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
