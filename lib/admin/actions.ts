'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import logger from '@/lib/logger'
import type { Cafe, Product, StockStatus } from '@/lib/types'
import { PAGE_SIZE } from '@/lib/admin/constants'

// Verify the caller is an authenticated admin (no café profile = admin for Phase 2).
// Admin identity is also confirmed by app_metadata.role when set.
async function assertAdmin(): Promise<string> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) throw new Error('Not authenticated')

  const isAdminByMeta = user.app_metadata?.role === 'admin'
  if (isAdminByMeta) return user.id

  // Fallback: admin has no café profile
  const { data: cafe } = await supabase
    .from('cafes')
    .select('id')
    .eq('id', user.id)
    .single()

  if (cafe) throw new Error('Not authorized')
  return user.id
}

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

  let query = admin
    .from('cafes')
    .select('*', { count: 'exact' })
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
    .select('*', { count: 'exact' })
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
  redirect('/admin/products')
}

export async function deleteProduct(id: string): Promise<{ error?: string }> {
  const adminId = await assertAdmin()
  const admin = createAdminClient()

  const existing = await getProduct(id)

  const { error } = await admin.from('products').delete().eq('id', id)

  if (error) {
    logger.error('Failed to delete product', { adminId, id, msg: error.message })
    return { error: error.message }
  }

  // Clean up storage image after successful DB delete
  if (existing?.image_url) await deleteStorageImage(existing.image_url)

  logger.info('Product deleted', { adminId, id })
  revalidatePath('/admin/products')
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
  return {}
}
