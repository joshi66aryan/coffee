import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServerClient } from '@supabase/ssr'

/**
 * Database-level authorization, executed against a real Postgres.
 *
 * Everything else in tests/ mocks Supabase at the network boundary, which is
 * the right call for application logic but means the policies and grants
 * themselves — the layer the whole security model rests on — were never
 * executed by anything. These tests do the opposite: no application code is
 * imported at all. They hold a café's own anon-key session and try, directly
 * against PostgREST, exactly what an attacker with a browser console would try.
 *
 * ── Running them ────────────────────────────────────────────────────────────
 *
 * They are skipped unless all three variables below are set, so the ordinary
 * `npm test` is unaffected:
 *
 *   SUPABASE_TEST_URL=https://<project>.supabase.co \
 *   SUPABASE_TEST_ANON_KEY=... \
 *   SUPABASE_TEST_SERVICE_ROLE_KEY=... \
 *   npm run test:rls
 *
 * The variable names are deliberately *not* the ones the app uses. This suite
 * creates users, orders and storage objects and deletes them again — pointing
 * it at the production project by accidentally inheriting NEXT_PUBLIC_SUPABASE_URL
 * is a mistake worth making impossible rather than merely unlikely. Use a
 * branch database or a local `supabase start`.
 *
 * Requires migrations through 013.
 */

const URL_ = process.env.SUPABASE_TEST_URL
const ANON_KEY = process.env.SUPABASE_TEST_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY

const configured = Boolean(URL_ && ANON_KEY && SERVICE_KEY)

const noCookies = { getAll: () => [], setAll: () => {} }

/** A client with no session at all — the `anon` role. */
function anonClient() {
  return createServerClient(URL_!, ANON_KEY!, { cookies: noCookies })
}

/** A client acting as one signed-in café, exactly as the browser would. */
function userClient(accessToken: string) {
  return createServerClient(URL_!, ANON_KEY!, {
    cookies: noCookies,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

/** Service role — bypasses RLS and grants. Used only to set up and tear down. */
function adminClient() {
  return createServerClient(URL_!, SERVICE_KEY!, { cookies: noCookies })
}

interface TestCafe {
  id: string
  email: string
  password: string
  accessToken: string
}

const PASSWORD = 'Sherpa!Trail9-test'
const stamp = Date.now()

let cafeA: TestCafe
let cafeB: TestCafe
let productId: string
let orderAId: string
let invoicePathA: string

async function createCafe(label: string): Promise<TestCafe> {
  const admin = adminClient()
  const email = `rls-${label}-${stamp}@example.test`

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  })
  if (error || !data.user) throw new Error(`could not create ${label}: ${error?.message}`)

  const { error: cafeError } = await admin.from('cafes').insert({
    id: data.user.id,
    name: `RLS ${label} ${stamp}`,
    contact_name: 'Test Manager',
    phone: '9800000000',
    neighborhood: 'Thamel',
    delivery_address: 'Thamel Marg 12',
    status: 'active',
  })
  if (cafeError) throw new Error(`could not create café row for ${label}: ${cafeError.message}`)

  const session = createServerClient(URL_!, ANON_KEY!, { cookies: noCookies })
  const { data: signIn, error: signInError } = await session.auth.signInWithPassword({
    email,
    password: PASSWORD,
  })
  if (signInError || !signIn.session) {
    throw new Error(`could not sign in as ${label}: ${signInError?.message}`)
  }

  return { id: data.user.id, email, password: PASSWORD, accessToken: signIn.session.access_token }
}

beforeAll(async () => {
  if (!configured) return

  const admin = adminClient()

  cafeA = await createCafe('a')
  cafeB = await createCafe('b')

  const { data: product, error: productError } = await admin
    .from('products')
    .insert({
      name: `RLS Test Roast ${stamp}`,
      category: 'Coffee',
      unit: 'kg',
      base_price: 900,
      stock_status: 'in_stock',
    })
    .select('id')
    .single()
  if (productError || !product) throw new Error(`could not create product: ${productError?.message}`)
  productId = product.id

  // An order that already exists and belongs to café A — the thing the
  // order_items append attack needs as a parent.
  const { data: orderId, error: orderError } = await admin.rpc('create_order_with_items', {
    p_cafe_id: cafeA.id,
    p_payment_type: 'cash',
    p_delivery_date: new Date().toISOString().slice(0, 10),
    p_total_amount: 1800,
    p_items: [{ product_id: productId, quantity: 2, unit_price_at_time_of_order: 900 }],
  })
  if (orderError || !orderId) throw new Error(`could not create order: ${orderError?.message}`)
  orderAId = orderId as string

  // Café A's invoice PDF, for the cross-café storage check.
  invoicePathA = `${cafeA.id}/${orderAId}.pdf`
  const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]) // "%PDF-1.4"
  const { error: uploadError } = await admin.storage
    .from('invoices')
    .upload(invoicePathA, pdfBytes, { contentType: 'application/pdf', upsert: true })
  if (uploadError) throw new Error(`could not upload invoice: ${uploadError.message}`)

  const { error: invoiceError } = await admin.from('invoices').insert({
    order_id: orderAId,
    invoice_number: `INV-RLS-${stamp}`,
    pdf_path: invoicePathA,
  })
  if (invoiceError) throw new Error(`could not create invoice row: ${invoiceError.message}`)
}, 60_000)

afterAll(async () => {
  if (!configured || !cafeA) return

  const admin = adminClient()
  await admin.storage.from('invoices').remove([invoicePathA])
  // Deleting the auth user cascades to cafes, and orders cascade from there.
  await admin.from('orders').delete().eq('cafe_id', cafeA.id)
  await admin.auth.admin.deleteUser(cafeA.id)
  await admin.auth.admin.deleteUser(cafeB.id)
  await admin.from('products').delete().eq('id', productId)
}, 60_000)

const describeRls = configured ? describe : describe.skip

describeRls('cafes — a café cannot promote itself', () => {
  it('cannot approve itself out of pending', async () => {
    const supabase = userClient(cafeA.accessToken)

    const { error } = await supabase
      .from('cafes')
      .update({ status: 'active' })
      .eq('id', cafeA.id)

    // Column-level grants are checked before RLS, so this is refused as a
    // privilege error rather than silently matching no rows.
    expect(error).not.toBeNull()
  })

  it('cannot grant itself credit terms', async () => {
    const supabase = userClient(cafeA.accessToken)

    const { error } = await supabase
      .from('cafes')
      .update({ credit_enabled: true })
      .eq('id', cafeA.id)

    expect(error).not.toBeNull()

    const { data } = await adminClient()
      .from('cafes')
      .select('credit_enabled')
      .eq('id', cafeA.id)
      .single()
    expect(data?.credit_enabled).toBe(false)
  })

  it('can still update its own contact details', async () => {
    const supabase = userClient(cafeA.accessToken)

    const { error } = await supabase
      .from('cafes')
      .update({ neighborhood: 'Patan' })
      .eq('id', cafeA.id)

    expect(error).toBeNull()
  })

  it('cannot read another café’s profile', async () => {
    const supabase = userClient(cafeA.accessToken)

    const { data } = await supabase.from('cafes').select('*').eq('id', cafeB.id)

    expect(data).toEqual([])
  })
})

describeRls('push_subscriptions — role is not client-writable', () => {
  it('cannot be inserted as an admin subscription', async () => {
    const supabase = userClient(cafeB.accessToken)
    const endpoint = `https://push.example/${stamp}-escalate`

    // The row is genuinely café B's, so every policy on the table passes. Only
    // the column grant and the trigger stand between this and every
    // new-order notification on the platform.
    const { error } = await supabase.from('push_subscriptions').insert({
      user_id: cafeB.id,
      role: 'admin',
      endpoint,
      p256dh: 'test-p256dh',
      auth_key: 'test-auth',
    })

    expect(error).not.toBeNull()

    const { data } = await adminClient()
      .from('push_subscriptions')
      .select('role')
      .eq('endpoint', endpoint)
    expect(data).toEqual([])
  })

  it('lands as a café subscription when the column is left alone', async () => {
    const supabase = userClient(cafeB.accessToken)
    const endpoint = `https://push.example/${stamp}-legit`

    const { error } = await supabase.from('push_subscriptions').insert({
      user_id: cafeB.id,
      endpoint,
      p256dh: 'test-p256dh',
      auth_key: 'test-auth',
    })

    expect(error).toBeNull()

    const { data } = await adminClient()
      .from('push_subscriptions')
      .select('role')
      .eq('endpoint', endpoint)
      .single()
    expect(data?.role).toBe('cafe')

    await adminClient().from('push_subscriptions').delete().eq('endpoint', endpoint)
  })

  it('cannot be escalated by updating a subscription it already owns', async () => {
    const admin = adminClient()
    const endpoint = `https://push.example/${stamp}-update`
    await admin.from('push_subscriptions').insert({
      user_id: cafeB.id,
      role: 'cafe',
      endpoint,
      p256dh: 'test-p256dh',
      auth_key: 'test-auth',
    })

    const supabase = userClient(cafeB.accessToken)
    const { error } = await supabase
      .from('push_subscriptions')
      .update({ role: 'admin' })
      .eq('endpoint', endpoint)

    expect(error).not.toBeNull()

    const { data } = await admin
      .from('push_subscriptions')
      .select('role')
      .eq('endpoint', endpoint)
      .single()
    expect(data?.role).toBe('cafe')

    await admin.from('push_subscriptions').delete().eq('endpoint', endpoint)
  })
})

describeRls('orders and order_items — the café session cannot write them', () => {
  it('cannot append a free line item to its own placed order', async () => {
    const supabase = userClient(cafeA.accessToken)

    const { error } = await supabase.from('order_items').insert({
      order_id: orderAId,
      product_id: productId,
      quantity: 500,
      unit_price_at_time_of_order: 0,
    })

    expect(error).not.toBeNull()

    // total_amount is not café-writable either, so the attack was: grow the
    // fulfilment list under a total that stays put.
    const { data } = await adminClient()
      .from('order_items')
      .select('id')
      .eq('order_id', orderAId)
    expect(data).toHaveLength(1)
  })

  it('cannot create an order row directly, bypassing price resolution', async () => {
    const supabase = userClient(cafeA.accessToken)

    const { error } = await supabase.from('orders').insert({
      cafe_id: cafeA.id,
      total_amount: 1,
      payment_type: 'credit',
      delivery_date: new Date().toISOString().slice(0, 10),
    })

    expect(error).not.toBeNull()
  })

  it('cannot read another café’s orders', async () => {
    const supabase = userClient(cafeB.accessToken)

    const { data } = await supabase.from('orders').select('*').eq('id', orderAId)

    expect(data).toEqual([])
  })

  it('cannot read another café’s order lines', async () => {
    const supabase = userClient(cafeB.accessToken)

    const { data } = await supabase.from('order_items').select('*').eq('order_id', orderAId)

    expect(data).toEqual([])
  })

  it('can still read its own order and its lines', async () => {
    const supabase = userClient(cafeA.accessToken)

    const { data: orders } = await supabase.from('orders').select('id').eq('id', orderAId)
    const { data: items } = await supabase.from('order_items').select('id').eq('order_id', orderAId)

    expect(orders).toHaveLength(1)
    expect(items).toHaveLength(1)
  })

  it('cannot rewrite the price history on its own order lines', async () => {
    const supabase = userClient(cafeA.accessToken)

    await supabase
      .from('order_items')
      .update({ unit_price_at_time_of_order: 0 })
      .eq('order_id', orderAId)

    // There is no UPDATE policy on this table, so RLS matches no rows — which
    // PostgREST reports as a successful update of nothing rather than an error.
    // What the row actually holds afterwards is the assertion that matters.
    const { data } = await adminClient()
      .from('order_items')
      .select('unit_price_at_time_of_order')
      .eq('order_id', orderAId)
      .single()

    expect(Number(data?.unit_price_at_time_of_order)).toBe(900)
  })
})

describeRls('invoices — financial records stay with their café', () => {
  it('cannot read another café’s invoice row', async () => {
    const supabase = userClient(cafeB.accessToken)

    const { data } = await supabase.from('invoices').select('*').eq('order_id', orderAId)

    expect(data).toEqual([])
  })

  it('cannot download another café’s invoice PDF', async () => {
    const supabase = userClient(cafeB.accessToken)

    const { data, error } = await supabase.storage.from('invoices').download(invoicePathA)

    // The bucket is private and scoped by the first path segment, which is the
    // owning café's id — guessing the path is not enough.
    expect(error ?? data).not.toBeNull()
    expect(data).toBeNull()
  })

  it('cannot sign a URL for another café’s invoice PDF', async () => {
    const supabase = userClient(cafeB.accessToken)

    const { data, error } = await supabase.storage.from('invoices').createSignedUrl(invoicePathA, 60)

    expect(error).not.toBeNull()
    expect(data).toBeNull()
  })

  it('cannot list another café’s invoice folder', async () => {
    const supabase = userClient(cafeB.accessToken)

    const { data } = await supabase.storage.from('invoices').list(cafeA.id)

    expect(data ?? []).toEqual([])
  })

  it('can download its own invoice PDF', async () => {
    const supabase = userClient(cafeA.accessToken)

    const { data, error } = await supabase.storage.from('invoices').download(invoicePathA)

    expect(error).toBeNull()
    expect(data).not.toBeNull()
  })
})

describeRls('storage — product images are read-only to cafés', () => {
  it('cannot upload into the product image bucket', async () => {
    const supabase = userClient(cafeA.accessToken)
    const bytes = new Uint8Array([0xff, 0xd8, 0xff])

    const { error } = await supabase.storage
      .from('product-images')
      .upload(`${stamp}-cafe-upload.webp`, bytes, { contentType: 'image/webp' })

    // Only app_metadata.role = 'admin' passes the insert policy.
    expect(error).not.toBeNull()
  })
})

describeRls('privileged functions are not callable over RPC', () => {
  it('cannot burn invoice numbers', async () => {
    const supabase = userClient(cafeA.accessToken)

    const { error } = await supabase.rpc('next_invoice_seq')

    expect(error).not.toBeNull()
  })

  it('cannot create an order through the privileged writer', async () => {
    const supabase = userClient(cafeA.accessToken)

    const { error } = await supabase.rpc('create_order_with_items', {
      p_cafe_id: cafeA.id,
      p_payment_type: 'credit',
      p_delivery_date: new Date().toISOString().slice(0, 10),
      p_total_amount: 0,
      p_items: [{ product_id: productId, quantity: 999, unit_price_at_time_of_order: 0 }],
    })

    expect(error).not.toBeNull()
  })

  it('cannot reset its own rate-limit counters', async () => {
    const supabase = userClient(cafeA.accessToken)

    const { error } = await supabase.rpc('consume_rate_limit', {
      p_key: 'signIn:whatever',
      p_limit: 1,
      p_window_seconds: 60,
    })

    expect(error).not.toBeNull()
  })

  it('cannot read the rate-limit table', async () => {
    const supabase = userClient(cafeA.accessToken)

    const { data, error } = await supabase.from('rate_limits').select('*')

    // RLS is on with no policies at all, so there is nothing to match.
    expect(error ?? data).toBeDefined()
    expect(data ?? []).toEqual([])
  })
})

describeRls('anonymous callers reach nothing', () => {
  it('cannot read cafés', async () => {
    const { data } = await anonClient().from('cafes').select('*')
    expect(data ?? []).toEqual([])
  })

  it('cannot read orders', async () => {
    const { data } = await anonClient().from('orders').select('*')
    expect(data ?? []).toEqual([])
  })

  it('cannot read the product catalog, which is for signed-in cafés', async () => {
    const { data } = await anonClient().from('products').select('*')
    expect(data ?? []).toEqual([])
  })

  it('cannot read invoices', async () => {
    const { data } = await anonClient().from('invoices').select('*')
    expect(data ?? []).toEqual([])
  })
})
