'use server'

import { cache } from 'react'
import { z } from 'zod'
import { revalidatePath, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PRODUCTS_CACHE_TAG } from '@/lib/cafe/catalog-cache'
import { getCachedUser } from '@/lib/supabase/user'
import logger from '@/lib/logger'
import { INVOICE_SIGNED_URL_TTL_SECONDS, invoicePdfPath } from '@/lib/invoice/storage'
import { sendPushToCafe } from '@/lib/push/send'
import { ORDER_STATUS_LABELS } from '@/lib/cafe/order-status'
import type {
  AdminOrder,
  Cafe,
  CafeProductPricingRow,
  InvoiceDownload,
  Order,
  OrderLineItem,
  OrderStatus,
  PaymentStatus,
  Product,
  StockStatus,
} from '@/lib/types'
import { PAGE_SIZE } from '@/lib/admin/constants'
import { isValidDateString, parseOrderSort } from '@/lib/admin/order-queue'
import { parsePaymentFilter, paymentFilterStatuses, sumAmounts } from '@/lib/admin/payments'
import {
  computeTopProducts,
  fillDailySales,
  orderStatusCounts,
  SALES_TREND_DAYS,
  summarizeCafes,
  summarizeDailySales,
  summarizeOrders,
  summarizeOrderStatusCounts,
  type CafeSummaryInput,
  type DashboardStats,
  type OrderSummaryInput,
} from '@/lib/admin/dashboard'

// Verify the caller is an authenticated admin (no café profile = admin for Phase 2).
// Admin identity is also confirmed by app_metadata.role when set.
//
// Cached per request: a single page render awaits several of these actions
// (the order detail page calls getAdminOrder *and* getOrderInvoice), and each
// one used to repeat the auth round trip and the café-profile lookup.
const assertAdmin = cache(async (): Promise<string> => {
  const { user, error } = await getCachedUser()

  if (error || !user) throw new Error('Not authenticated')

  const isAdminByMeta = user.app_metadata?.role === 'admin'
  if (isAdminByMeta) return user.id

  // Fallback: admin has no café profile
  const supabase = await createClient()
  const { data: cafe } = await supabase
    .from('cafes')
    .select('id')
    .eq('id', user.id)
    .single()

  if (cafe) throw new Error('Not authorized')
  return user.id
})

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export async function getCafes(params?: {
  q?: string
  page?: number
}): Promise<PaginatedResult<Cafe>> {
  await assertAdmin()
  const admin = createAdminClient()

  const page = Math.max(1, params?.page ?? 1)
  const q = params?.q?.trim() ?? ''
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // 'estimated' rather than 'exact': PostgREST counts the matching set exactly
  // while it is small and switches to the planner's estimate once it exceeds
  // the configured max-rows, so pagination stays correct today without paying
  // for a full count of every row on every page request later on.
  let query = admin
    .from('cafes')
    .select('*', { count: 'estimated' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (q) {
    query = query.or(`name.ilike.%${q}%,contact_name.ilike.%${q}%,neighborhood.ilike.%${q}%,phone.ilike.%${q}%`)
  }

  const { data, error, count } = await query

  if (error) {
    logger.error('Failed to fetch cafés', { msg: error.message })
    return { items: [], total: 0, page, pageSize: PAGE_SIZE }
  }

  return {
    items: (data ?? []) as Cafe[],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  }
}

export async function approveCafe(cafeId: string): Promise<{ error?: string }> {
  const adminId = await assertAdmin()
  const admin = createAdminClient()

  const { error } = await admin
    .from('cafes')
    .update({ status: 'active' })
    .eq('id', cafeId)

  if (error) {
    logger.error('Failed to approve café', { cafeId, msg: error.message })
    return { error: error.message }
  }

  logger.info('Café approved', { cafeId, adminId })
  return {}
}

export async function rejectCafe(cafeId: string): Promise<{ error?: string }> {
  const adminId = await assertAdmin()
  const admin = createAdminClient()

  const { error } = await admin
    .from('cafes')
    .update({ status: 'rejected' })
    .eq('id', cafeId)

  if (error) {
    logger.error('Failed to reject café', { cafeId, msg: error.message })
    return { error: error.message }
  }

  logger.info('Café rejected', { cafeId, adminId })
  return {}
}

export async function getCafe(id: string): Promise<Cafe | null> {
  await assertAdmin()
  const admin = createAdminClient()

  const { data, error } = await admin.from('cafes').select('*').eq('id', id).single<Cafe>()

  if (error) {
    logger.error('Failed to fetch café', { id, msg: error.message })
    return null
  }

  return data
}

export async function getCafeCompletedOrderCount(cafeId: string): Promise<number> {
  await assertAdmin()
  const admin = createAdminClient()

  const { count, error } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('cafe_id', cafeId)
    .eq('status', 'delivered')

  if (error) {
    logger.error('Failed to count completed orders for café', { cafeId, msg: error.message })
    return 0
  }

  return count ?? 0
}

export async function updateCafeCreditEnabled(
  cafeId: string,
  enabled: boolean,
): Promise<{ error?: string }> {
  const adminId = await assertAdmin()
  const admin = createAdminClient()

  const { error } = await admin.from('cafes').update({ credit_enabled: enabled }).eq('id', cafeId)

  if (error) {
    logger.error('Failed to update credit setting', { adminId, cafeId, msg: error.message })
    return { error: error.message }
  }

  logger.info('Credit setting updated', { adminId, cafeId, enabled })
  revalidatePath(`/admin/cafes/${cafeId}`)
  return {}
}

export async function getCafeProductPricing(cafeId: string): Promise<CafeProductPricingRow[]> {
  await assertAdmin()
  const admin = createAdminClient()

  const [productsResult, pricesResult] = await Promise.all([
    admin.from('products').select('*').order('category').order('name').returns<Product[]>(),
    admin
      .from('cafe_product_prices')
      .select('product_id, custom_price')
      .eq('cafe_id', cafeId)
      .returns<{ product_id: string; custom_price: number }[]>(),
  ])

  if (productsResult.error) {
    logger.error('Failed to fetch products for café pricing', { cafeId, msg: productsResult.error.message })
    return []
  }

  if (pricesResult.error) {
    logger.error('Failed to fetch café price overrides', { cafeId, msg: pricesResult.error.message })
  }

  const overrideMap = new Map((pricesResult.data ?? []).map(row => [row.product_id, row.custom_price]))

  return (productsResult.data ?? []).map(product => ({
    product_id: product.id,
    name: product.name,
    category: product.category,
    unit: product.unit,
    base_price: product.base_price,
    custom_price: overrideMap.get(product.id) ?? null,
  }))
}

const SetCafePriceSchema = z.object({
  customPrice: z.number().nonnegative().nullable(),
})

export async function setCafeProductPrice(
  cafeId: string,
  productId: string,
  customPrice: number | null,
): Promise<{ error?: string }> {
  const adminId = await assertAdmin()

  const parsed = SetCafePriceSchema.safeParse({ customPrice })
  if (!parsed.success) return { error: 'Enter a valid price.' }

  const admin = createAdminClient()

  if (parsed.data.customPrice === null) {
    const { error } = await admin
      .from('cafe_product_prices')
      .delete()
      .eq('cafe_id', cafeId)
      .eq('product_id', productId)

    if (error) {
      logger.error('Failed to clear café price override', { adminId, cafeId, productId, msg: error.message })
      return { error: error.message }
    }

    logger.info('Café price override cleared', { adminId, cafeId, productId })
    revalidatePath(`/admin/cafes/${cafeId}`)
    return {}
  }

  const { error } = await admin
    .from('cafe_product_prices')
    .upsert(
      { cafe_id: cafeId, product_id: productId, custom_price: parsed.data.customPrice },
      { onConflict: 'cafe_id,product_id' },
    )

  if (error) {
    logger.error('Failed to set café price override', { adminId, cafeId, productId, msg: error.message })
    return { error: error.message }
  }

  logger.info('Café price override set', {
    adminId,
    cafeId,
    productId,
    customPrice: parsed.data.customPrice,
  })
  revalidatePath(`/admin/cafes/${cafeId}`)
  return {}
}

// ── Orders ────────────────────────────────────────────────────────────────────

interface OrderRow extends Order {
  cafes: { name: string } | null
}

export async function getOrders(params?: {
  q?: string
  sort?: string
  dir?: string
  page?: number
  status?: OrderStatus
  dateFrom?: string
  dateTo?: string
}): Promise<PaginatedResult<AdminOrder>> {
  await assertAdmin()
  const admin = createAdminClient()

  const page = Math.max(1, params?.page ?? 1)
  const { sort, dir } = parseOrderSort(params?.sort, params?.dir)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const q = params?.q?.trim()

  let query = admin
    .from('orders')
    .select('*, cafes(name)', { count: 'estimated' })
    .order(sort, { ascending: dir === 'asc' })

  if (params?.status) {
    query = query.eq('status', params.status)
  }

  if (isValidDateString(params?.dateFrom)) {
    query = query.gte('created_at', `${params.dateFrom}T00:00:00.000Z`)
  }

  if (isValidDateString(params?.dateTo)) {
    query = query.lte('created_at', `${params.dateTo}T23:59:59.999Z`)
  }

  if (q) {
    const { data: matchingCafes, error: cafeSearchError } = await admin
      .from('cafes')
      .select('id')
      .ilike('name', `%${q}%`)

    if (cafeSearchError) {
      logger.error('Failed to search cafés for order search', { msg: cafeSearchError.message })
      return { items: [], total: 0, page, pageSize: PAGE_SIZE }
    }

    const cafeIds = (matchingCafes ?? []).map(c => c.id)
    if (cafeIds.length === 0) {
      return { items: [], total: 0, page, pageSize: PAGE_SIZE }
    }
    query = query.in('cafe_id', cafeIds)
  }

  const { data, error, count } = await query.range(from, to).returns<OrderRow[]>()

  if (error) {
    logger.error('Failed to fetch orders', { msg: error.message })
    return { items: [], total: 0, page, pageSize: PAGE_SIZE }
  }

  const items: AdminOrder[] = (data ?? []).map(({ cafes, ...order }) => ({
    ...order,
    cafe_name: cafes?.name ?? 'Unknown café',
  }))

  return { items, total: count ?? 0, page, pageSize: PAGE_SIZE }
}

interface OrderItemRow {
  id: string
  product_id: string
  quantity: number
  unit_price_at_time_of_order: number
  products: { name: string; unit: string } | null
}

interface PaymentTotalsRow {
  outstanding_total: number
  paid_total: number
}

export async function getAdminOrder(
  id: string,
): Promise<{ order: AdminOrder; items: OrderLineItem[] } | null> {
  await assertAdmin()
  const admin = createAdminClient()

  const [orderResult, itemsResult] = await Promise.all([
    admin.from('orders').select('*, cafes(name)').eq('id', id).single<OrderRow>(),
    admin
      .from('order_items')
      .select('id, product_id, quantity, unit_price_at_time_of_order, products(name, unit)')
      .eq('order_id', id)
      .returns<OrderItemRow[]>(),
  ])

  if (orderResult.error || !orderResult.data) {
    // PGRST116 = no matching row — expected when the order was deleted or the
    // id is stale (e.g. a leftover link after an admin deletes the order).
    if (orderResult.error && orderResult.error.code !== 'PGRST116') {
      logger.error('Failed to fetch order', { orderId: id, msg: orderResult.error.message })
    }
    return null
  }

  if (itemsResult.error) {
    logger.error('Failed to fetch order items', { orderId: id, msg: itemsResult.error.message })
  }

  const { cafes, ...order } = orderResult.data

  const items: OrderLineItem[] = (itemsResult.data ?? []).map(row => ({
    id: row.id,
    product_id: row.product_id,
    name: row.products?.name ?? 'Unknown product',
    unit: row.products?.unit ?? '',
    quantity: row.quantity,
    unit_price_at_time_of_order: row.unit_price_at_time_of_order,
  }))

  return { order: { ...order, cafe_name: cafes?.name ?? 'Unknown café' }, items }
}

export async function getOrderInvoice(orderId: string): Promise<InvoiceDownload | null> {
  await assertAdmin()
  const admin = createAdminClient()

  const { data: invoice, error } = await admin
    .from('invoices')
    .select('invoice_number, pdf_path')
    .eq('order_id', orderId)
    .single<{ invoice_number: string; pdf_path: string }>()

  if (error || !invoice) {
    // PGRST116 = no matching row — expected when an invoice hasn't been generated yet.
    if (error && error.code !== 'PGRST116') {
      logger.error('Failed to fetch invoice', { orderId, msg: error.message })
    }
    return null
  }

  const { data: signed, error: signError } = await admin.storage
    .from('invoices')
    .createSignedUrl(invoice.pdf_path, INVOICE_SIGNED_URL_TTL_SECONDS)

  if (signError || !signed) {
    logger.error('Failed to create invoice download URL', { orderId, msg: signError?.message })
    return null
  }

  return { invoiceNumber: invoice.invoice_number, downloadUrl: signed.signedUrl }
}

const UpdateOrderStatusSchema = z.object({
  status: z.enum(['received', 'confirmed', 'out_for_delivery', 'delivered']),
})

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<{ error?: string }> {
  const adminId = await assertAdmin()

  const parsed = UpdateOrderStatusSchema.safeParse({ status })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()
  const { data: updated, error } = await admin
    .from('orders')
    .update({ status: parsed.data.status })
    .eq('id', orderId)
    .select('cafe_id')
    .single()

  if (error) {
    logger.error('Failed to update order status', { adminId, orderId, msg: error.message })
    return { error: error.message }
  }

  logger.info('Order status updated', { adminId, orderId, status: parsed.data.status })
  revalidatePath('/admin')
  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)

  // Notifying the café runs after the response is sent — a slow or hanging
  // push service must never stall the status-update click itself.
  after(async () => {
    try {
      const shortId = orderId.split('-')[0].toUpperCase()
      await sendPushToCafe(updated.cafe_id, {
        title: 'Order status updated',
        body: `Your order #${shortId} is now ${ORDER_STATUS_LABELS[parsed.data.status]}`,
        url: `/orders/${orderId}`,
      })
    } catch (err) {
      logger.error('Failed to notify café of status change', {
        orderId,
        msg: err instanceof Error ? err.message : String(err),
      })
    }
  })

  return {}
}

export async function deleteOrder(id: string): Promise<{ error?: string }> {
  const adminId = await assertAdmin()
  const admin = createAdminClient()

  const { data: order, error: fetchError } = await admin
    .from('orders')
    .select('cafe_id')
    .eq('id', id)
    .single<{ cafe_id: string }>()

  if (fetchError || !order) {
    logger.error('Order not found for deletion', { adminId, id, msg: fetchError?.message })
    return { error: 'Order not found.' }
  }

  // order_items and invoices rows cascade-delete with the order (both are
  // ON DELETE CASCADE). The invoice PDF file in storage does not, so it's
  // removed explicitly below.
  const { error } = await admin.from('orders').delete().eq('id', id)

  if (error) {
    logger.error('Failed to delete order', { adminId, id, msg: error.message })
    return { error: error.message }
  }

  const { error: storageError } = await admin.storage
    .from('invoices')
    .remove([invoicePdfPath(order.cafe_id, id)])

  if (storageError) {
    logger.warn('Failed to delete invoice PDF from storage', { adminId, id, msg: storageError.message })
  }

  logger.info('Order deleted', { adminId, id })
  revalidatePath('/admin')
  revalidatePath('/admin/orders')
  revalidatePath('/admin/payments')
  return {}
}

const UpdatePaymentStatusSchema = z.object({
  payment_status: z.enum(['paid', 'pending', 'due']),
})

export async function updatePaymentStatus(
  orderId: string,
  payment_status: PaymentStatus,
): Promise<{ error?: string }> {
  const adminId = await assertAdmin()

  const parsed = UpdatePaymentStatusSchema.safeParse({ payment_status })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()
  const { error } = await admin
    .from('orders')
    .update({ payment_status: parsed.data.payment_status })
    .eq('id', orderId)

  if (error) {
    logger.error('Failed to update payment status', { adminId, orderId, msg: error.message })
    return { error: error.message }
  }

  logger.info('Payment status updated', { adminId, orderId, payment_status: parsed.data.payment_status })
  revalidatePath('/admin/payments')
  revalidatePath('/admin')
  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)
  return {}
}

export async function getPayments(params?: {
  q?: string
  filter?: string
  sort?: string
  dir?: string
  page?: number
}): Promise<PaginatedResult<AdminOrder> & { outstandingTotal: number; paidTotal: number }> {
  await assertAdmin()
  const admin = createAdminClient()

  const page = Math.max(1, params?.page ?? 1)
  const filter = parsePaymentFilter(params?.filter)
  const { sort, dir } = parseOrderSort(params?.sort, params?.dir ?? 'asc')
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const q = params?.q?.trim()
  const statuses = paymentFilterStatuses(filter)

  let query = admin
    .from('orders')
    .select('*, cafes(name)', { count: 'estimated' })
    .order(sort, { ascending: dir === 'asc' })

  if (statuses) {
    query = query.in('payment_status', statuses)
  }

  if (q) {
    const { data: matchingCafes, error: cafeSearchError } = await admin
      .from('cafes')
      .select('id')
      .ilike('name', `%${q}%`)

    if (cafeSearchError) {
      logger.error('Failed to search cafés for payments search', { msg: cafeSearchError.message })
      return { items: [], total: 0, page, pageSize: PAGE_SIZE, outstandingTotal: 0, paidTotal: 0 }
    }

    const cafeIds = (matchingCafes ?? []).map(c => c.id)
    if (cafeIds.length === 0) {
      return { items: [], total: 0, page, pageSize: PAGE_SIZE, outstandingTotal: 0, paidTotal: 0 }
    }
    query = query.in('cafe_id', cafeIds)
  }

  // The two header figures are sums over the whole orders table. They are
  // computed in Postgres rather than by transferring every matching row's
  // total_amount and adding them up here.
  const [{ data, error, count }, totalsResult] = await Promise.all([
    query.range(from, to).returns<OrderRow[]>(),
    admin.rpc('admin_payment_totals'),
  ])

  if (error) {
    logger.error('Failed to fetch payments', { msg: error.message })
    return { items: [], total: 0, page, pageSize: PAGE_SIZE, outstandingTotal: 0, paidTotal: 0 }
  }

  // Falls back to summing in JS on a database that hasn't run migration 011.
  // Safe to delete along with the fallback branch once every environment is
  // migrated.
  const totals = totalsResult.data as PaymentTotalsRow | null
  let outstandingTotal = totals?.outstanding_total ?? 0
  let paidTotal = totals?.paid_total ?? 0

  if (totalsResult.error || !totals) {
    if (totalsResult.error && !isMissingFunction(totalsResult.error.code)) {
      logger.error('Payment totals aggregate failed', {
        msg: totalsResult.error.message,
        code: totalsResult.error.code,
      })
    }
    const [outstandingRows, paidRows] = await Promise.all([
      admin.from('orders').select('total_amount').in('payment_status', ['pending', 'due'])
        .returns<{ total_amount: number }[]>(),
      admin.from('orders').select('total_amount').eq('payment_status', 'paid')
        .returns<{ total_amount: number }[]>(),
    ])
    outstandingTotal = sumAmounts(outstandingRows.data ?? [])
    paidTotal = sumAmounts(paidRows.data ?? [])
  }

  const items: AdminOrder[] = (data ?? []).map(({ cafes, ...order }) => ({
    ...order,
    cafe_name: cafes?.name ?? 'Unknown café',
  }))

  return { items, total: count ?? 0, page, pageSize: PAGE_SIZE, outstandingTotal, paidTotal }
}

// ── Products ──────────────────────────────────────────────────────────────────

const ProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  category: z.string().min(1, 'Category is required').max(50),
  unit: z.string().min(1, 'Unit is required').max(20),
  base_price: z.coerce.number().nonnegative('Price must be 0 or more'),
  stock_status: z.enum(['in_stock', 'low', 'out_of_stock']),
  description: z.string().max(2000).optional(),
})

// Image is uploaded directly from the browser to Supabase Storage.
// The server action only receives the resulting public URL, never the raw file.
function extractStoragePath(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl)
    const match = url.pathname.match(/\/product-images\/(.+)$/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

async function deleteStorageImage(publicUrl: string): Promise<void> {
  const path = extractStoragePath(publicUrl)
  if (!path) return
  const admin = createAdminClient()
  const { error } = await admin.storage.from('product-images').remove([path])
  if (error) logger.warn('Failed to delete product image from storage', { path, msg: error.message })
}

// Returns a signed upload URL so the browser can PUT the file directly to Supabase Storage
// without routing the binary through Next.js and without needing storage RLS write access.
export async function createProductImageUploadUrl(
  filename: string,
): Promise<{ signedUrl: string; path: string; publicUrl: string } | { error: string }> {
  const adminId = await assertAdmin()
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const admin = createAdminClient()

  const { data, error } = await admin.storage
    .from('product-images')
    .createSignedUploadUrl(path)

  if (error || !data) {
    logger.error('Failed to create signed upload URL', { adminId, msg: error?.message })
    return { error: 'Could not prepare image upload. Please try again.' }
  }

  const { data: urlData } = admin.storage.from('product-images').getPublicUrl(path)

  return { signedUrl: data.signedUrl, path, publicUrl: urlData.publicUrl }
}

export async function getProducts(params?: {
  q?: string
  page?: number
}): Promise<PaginatedResult<Product>> {
  await assertAdmin()
  const admin = createAdminClient()

  const page = Math.max(1, params?.page ?? 1)
  const q = params?.q?.trim() ?? ''
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = admin
    .from('products')
    .select('*', { count: 'estimated' })
    .is('archived_at', null)
    .order('category')
    .order('name')
    .range(from, to)

  if (q) {
    query = query.or(`name.ilike.%${q}%,category.ilike.%${q}%,description.ilike.%${q}%`)
  }

  const { data, error, count } = await query

  if (error) {
    logger.error('Failed to fetch products', { msg: error.message })
    return { items: [], total: 0, page, pageSize: PAGE_SIZE }
  }

  return {
    items: (data ?? []) as Product[],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  }
}

export async function getProduct(id: string): Promise<Product | null> {
  await assertAdmin()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    logger.error('Failed to fetch product', { id, msg: error.message })
    return null
  }

  return data as Product
}

export async function createProduct(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const adminId = await assertAdmin()

  const parsed = ProductSchema.safeParse({
    name: formData.get('name'),
    category: formData.get('category'),
    unit: formData.get('unit'),
    base_price: formData.get('base_price'),
    stock_status: formData.get('stock_status'),
    description: formData.get('description') || undefined,
  })

  if (!parsed.success) {
    const msg = parsed.error.issues[0].message
    return { error: msg }
  }

  // image_url is a public URL set by the browser after uploading directly to Supabase Storage
  const image_url = (formData.get('image_url') as string | null) || null

  const admin = createAdminClient()
  const { error } = await admin.from('products').insert({ ...parsed.data, image_url })

  if (error) {
    logger.error('Failed to create product', { adminId, msg: error.message })
    return { error: 'Failed to save product. Please try again.' }
  }

  logger.info('Product created', { adminId, name: parsed.data.name })
  revalidatePath('/admin/products')
  // The café storefront reads the catalog from a cross-request cache — every
  // product mutation has to drop it, or shops keep serving the old list.
  updateTag(PRODUCTS_CACHE_TAG)
  redirect('/admin/products')
}

export async function updateProduct(
  id: string,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const adminId = await assertAdmin()

  const parsed = ProductSchema.safeParse({
    name: formData.get('name'),
    category: formData.get('category'),
    unit: formData.get('unit'),
    base_price: formData.get('base_price'),
    stock_status: formData.get('stock_status'),
    description: formData.get('description') || undefined,
  })

  if (!parsed.success) {
    const msg = parsed.error.issues[0].message
    return { error: msg }
  }

  const admin = createAdminClient()

  // Resolve image: new URL from browser upload, clear existing, or leave unchanged.
  let image_url: string | null | undefined
  const newImageUrl = (formData.get('image_url') as string | null) || null
  const clearImage = formData.get('clear_image') === '1'

  if (newImageUrl) {
    // Replace old image file in storage if one exists
    const existing = await getProduct(id)
    if (existing?.image_url) await deleteStorageImage(existing.image_url)
    image_url = newImageUrl
  } else if (clearImage) {
    const existing = await getProduct(id)
    if (existing?.image_url) await deleteStorageImage(existing.image_url)
    image_url = null
  }
  // undefined = no change, omit from update payload

  const payload = image_url !== undefined
    ? { ...parsed.data, image_url }
    : parsed.data

  const { error } = await admin.from('products').update(payload).eq('id', id)

  if (error) {
    logger.error('Failed to update product', { adminId, id, msg: error.message })
    return { error: 'Failed to save product. Please try again.' }
  }

  logger.info('Product updated', { adminId, id })
  revalidatePath('/admin/products')
  updateTag(PRODUCTS_CACHE_TAG)
  redirect('/admin/products')
}

export async function deleteProduct(id: string): Promise<{ error?: string }> {
  const adminId = await assertAdmin()
  const admin = createAdminClient()

  const existing = await getProduct(id)

  const { count, error: orderItemsError } = await admin
    .from('order_items')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', id)

  if (orderItemsError) {
    logger.error('Failed to check order history before deleting product', {
      adminId,
      id,
      msg: orderItemsError.message,
    })
    return { error: orderItemsError.message }
  }

  // order_items.product_id is ON DELETE RESTRICT so past invoices/orders always
  // resolve to a real product — a product that's been ordered is archived
  // (hidden from the catalog and admin list) instead of hard-deleted.
  if ((count ?? 0) > 0) {
    const { error } = await admin
      .from('products')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      logger.error('Failed to archive product', { adminId, id, msg: error.message })
      return { error: error.message }
    }

    logger.info('Product archived (has order history)', { adminId, id })
    revalidatePath('/admin/products')
    updateTag(PRODUCTS_CACHE_TAG)
    return {}
  }

  const { error } = await admin.from('products').delete().eq('id', id)

  if (error) {
    logger.error('Failed to delete product', { adminId, id, msg: error.message })
    return { error: error.message }
  }

  // Clean up storage image after successful DB delete
  if (existing?.image_url) await deleteStorageImage(existing.image_url)

  logger.info('Product deleted', { adminId, id })
  revalidatePath('/admin/products')
  updateTag(PRODUCTS_CACHE_TAG)
  return {}
}

export async function updateStockStatus(
  id: string,
  stock_status: StockStatus,
): Promise<{ error?: string }> {
  const adminId = await assertAdmin()
  const admin = createAdminClient()

  const { error } = await admin
    .from('products')
    .update({ stock_status })
    .eq('id', id)

  if (error) {
    logger.error('Failed to update stock status', { adminId, id, msg: error.message })
    return { error: error.message }
  }

  logger.info('Stock status updated', { adminId, id, stock_status })
  revalidatePath('/admin/products')
  updateTag(PRODUCTS_CACHE_TAG)
  return {}
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

interface DashboardOrderRow extends OrderSummaryInput {
  created_at: string
}

interface DashboardOrderItemRow {
  product_id: string
  quantity: number
  unit_price_at_time_of_order: number
  products: { name: string } | null
}

interface DashboardStatsRow {
  total_sales: number
  total_orders: number
  active_orders: number
  outstanding_total: number
  active_cafes: number
  pending_cafes: number
  status_counts: { status: OrderStatus; count: number }[]
  sales_trend: { date: string; total: number }[]
  top_products: { product_id: string; name: string; quantity_sold: number; revenue: number }[]
}

// PostgREST reports an unknown function this way; Postgres itself uses 42883.
// Both mean migration 011 hasn't been applied to this database yet.
function isMissingFunction(code?: string): boolean {
  return code === 'PGRST202' || code === '42883'
}

export async function getDashboardStats(): Promise<DashboardStats> {
  await assertAdmin()
  const admin = createAdminClient()

  // The function returns a single json object, not a set of rows; without
  // generated database types the client can't infer that, so the result is
  // narrowed here.
  const { data: rpcData, error } = await admin.rpc('admin_dashboard_stats', {
    trend_days: SALES_TREND_DAYS,
  })

  if (error || !rpcData) {
    if (error && !isMissingFunction(error.code)) {
      logger.error('Dashboard aggregate failed', { msg: error.message, code: error.code })
    }
    // Falls back to reducing the raw rows in JS so the dashboard keeps working
    // on a database that hasn't run migration 011 yet. Safe to delete — along
    // with getDashboardStatsInJs — once every environment is migrated.
    return getDashboardStatsInJs()
  }

  const data = rpcData as DashboardStatsRow

  return {
    totalSales: data.total_sales,
    totalOrders: data.total_orders,
    activeOrders: data.active_orders,
    outstandingTotal: data.outstanding_total,
    activeCafes: data.active_cafes,
    pendingCafes: data.pending_cafes,
    statusCounts: orderStatusCounts(data.status_counts ?? []),
    salesTrend: fillDailySales(
      new Map((data.sales_trend ?? []).map(row => [row.date, row.total])),
      SALES_TREND_DAYS,
    ),
    topProducts: (data.top_products ?? []).map(row => ({
      product_id: row.product_id,
      name: row.name,
      quantitySold: row.quantity_sold,
      revenue: row.revenue,
    })),
  }
}

async function getDashboardStatsInJs(): Promise<DashboardStats> {
  const admin = createAdminClient()

  const [ordersResult, cafesResult, itemsResult] = await Promise.all([
    admin.from('orders').select('total_amount, status, payment_status, created_at').returns<DashboardOrderRow[]>(),
    admin.from('cafes').select('status').returns<CafeSummaryInput[]>(),
    admin
      .from('order_items')
      .select('product_id, quantity, unit_price_at_time_of_order, products(name)')
      .returns<DashboardOrderItemRow[]>(),
  ])

  if (ordersResult.error) {
    logger.error('Failed to fetch orders for dashboard', { msg: ordersResult.error.message })
  }
  if (cafesResult.error) {
    logger.error('Failed to fetch cafés for dashboard', { msg: cafesResult.error.message })
  }
  if (itemsResult.error) {
    logger.error('Failed to fetch order items for dashboard', { msg: itemsResult.error.message })
  }

  const orders = ordersResult.data ?? []
  const orderSummary = summarizeOrders(orders)
  const cafeSummary = summarizeCafes(cafesResult.data ?? [])
  const salesTrend = summarizeDailySales(orders)
  const statusCounts = summarizeOrderStatusCounts(orders)
  const topProducts = computeTopProducts(
    (itemsResult.data ?? []).map(row => ({
      product_id: row.product_id,
      name: row.products?.name ?? 'Unknown product',
      quantity: row.quantity,
      unit_price: row.unit_price_at_time_of_order,
    })),
  )

  return { ...orderSummary, ...cafeSummary, topProducts, salesTrend, statusCounts }
}
