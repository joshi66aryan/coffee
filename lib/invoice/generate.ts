import { createAdminClient } from '@/lib/supabase/admin'
import logger from '@/lib/logger'
import type { Order } from '@/lib/types'
import { formatInvoiceNumber } from './number'
import { invoicePdfPath } from './storage'
import { buildInvoiceData } from './data'
import { renderInvoicePdf } from './pdf'

interface OrderItemRow {
  quantity: number
  unit_price_at_time_of_order: number
  products: { name: string; unit: string } | null
}

// Generates the invoice PDF for an order and stores it once, per PRD §4.6.
// Called right after order placement — failures here are logged but must
// never fail the order itself, since the order was already placed successfully.
export async function generateInvoiceForOrder(
  orderId: string,
): Promise<{ invoiceNumber: string } | { error: string }> {
  const admin = createAdminClient()

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single<Order>()

  if (orderError || !order) {
    logger.error('Invoice generation: order not found', { orderId, msg: orderError?.message })
    return { error: 'Order not found' }
  }

  const [cafeResult, itemsResult] = await Promise.all([
    admin.from('cafes').select('name, delivery_address').eq('id', order.cafe_id).single<{
      name: string
      delivery_address: string
    }>(),
    admin
      .from('order_items')
      .select('quantity, unit_price_at_time_of_order, products(name, unit)')
      .eq('order_id', orderId)
      .returns<OrderItemRow[]>(),
  ])

  if (cafeResult.error || !cafeResult.data) {
    logger.error('Invoice generation: café not found', { orderId, msg: cafeResult.error?.message })
    return { error: 'Café not found' }
  }

  if (itemsResult.error) {
    logger.error('Invoice generation: failed to fetch order items', {
      orderId,
      msg: itemsResult.error.message,
    })
    return { error: 'Failed to load order items' }
  }

  const { data: seq, error: seqError } = await admin.rpc('next_invoice_seq')

  if (seqError || seq == null) {
    logger.error('Invoice generation: failed to reserve invoice number', {
      orderId,
      msg: seqError?.message,
    })
    return { error: 'Failed to reserve invoice number' }
  }

  const invoiceNumber = formatInvoiceNumber(Number(seq))

  const invoiceData = buildInvoiceData({
    invoiceNumber,
    order,
    cafe: cafeResult.data,
    items: (itemsResult.data ?? []).map(row => ({
      name: row.products?.name ?? 'Unknown product',
      unit: row.products?.unit ?? '',
      quantity: row.quantity,
      unit_price_at_time_of_order: row.unit_price_at_time_of_order,
    })),
  })

  const pdfBuffer = await renderInvoicePdf(invoiceData)
  const pdfPath = invoicePdfPath(order.cafe_id, orderId)

  const { error: uploadError } = await admin.storage
    .from('invoices')
    .upload(pdfPath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

  if (uploadError) {
    logger.error('Invoice generation: failed to upload PDF', { orderId, msg: uploadError.message })
    return { error: 'Failed to store invoice PDF' }
  }

  const { error: insertError } = await admin.from('invoices').insert({
    order_id: orderId,
    invoice_number: invoiceNumber,
    pdf_path: pdfPath,
  })

  if (insertError) {
    logger.error('Invoice generation: failed to record invoice row', {
      orderId,
      msg: insertError.message,
    })
    return { error: 'Failed to save invoice record' }
  }

  const { error: updateError } = await admin
    .from('orders')
    .update({ invoice_number: invoiceNumber })
    .eq('id', orderId)

  if (updateError) {
    logger.warn('Invoice generation: failed to denormalize invoice number onto order', {
      orderId,
      msg: updateError.message,
    })
  }

  logger.info('Invoice generated', { orderId, invoiceNumber })
  return { invoiceNumber }
}
