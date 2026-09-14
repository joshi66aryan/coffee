import { test, expect } from '@playwright/test'
import { createServerClient } from '@supabase/ssr'

/**
 * Placing an order, through the real browser against a real Postgres.
 *
 * This is the one flow in the app where a bug costs money, and until now it was
 * the only critical flow with no end-to-end coverage at all: every other spec in
 * e2e/ is either unauthenticated HTTP or a browser test of a page that does not
 * write anything. The unit tests around `placeOrder` mock Supabase at the
 * network boundary, so the server action, the RPC it calls, the RLS policies
 * that RPC runs under, and the after-response invoice render had never once
 * executed together.
 *
 * ── Running it ──────────────────────────────────────────────────────────────
 *
 * Skipped unless pointed at a database, so the ordinary `npm run test:e2e` is
 * unaffected. Bring up a local stack and run the app against it:
 *
 *   npx supabase start -x studio,realtime,logflare,vector,edge-runtime,imgproxy,mailpit,postgres-meta,supavisor
 *
 *   # the app under test must talk to that stack, not to .env.local's project —
 *   # variables already in the environment win over .env files in Next.js
 *   export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
 *   export NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>
 *   export SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase start>
 *
 *   # and this spec needs its own handle on the same database
 *   export SUPABASE_TEST_URL=$NEXT_PUBLIC_SUPABASE_URL
 *   export SUPABASE_TEST_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   export SUPABASE_TEST_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
 *   export PLAYWRIGHT_BROWSER_AVAILABLE=1
 *
 *   npx playwright test e2e/order-placement.spec.ts --project=chromium
 *
 * The SUPABASE_TEST_* names are deliberately not the ones the app uses, for the
 * same reason tests/rls/policies.test.ts uses them: this spec creates a café and
 * places an order, and inheriting the production project by accident is a
 * mistake worth making impossible rather than merely unlikely. Use a local
 * `supabase start` or a branch database — never the production project.
 *
 * Requires migrations through 014.
 */

const URL_ = process.env.SUPABASE_TEST_URL
const ANON_KEY = process.env.SUPABASE_TEST_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY

const configured = Boolean(URL_ && ANON_KEY && SERVICE_KEY)
const browserAvailable = Boolean(process.env.PLAYWRIGHT_BROWSER_AVAILABLE)

const noCookies = { getAll: () => [], setAll: () => {} }

/** Service role — bypasses RLS. Used only to seed, to assert, and to tear down. */
function adminClient() {
  return createServerClient(URL_!, SERVICE_KEY!, { cookies: noCookies })
}

const PASSWORD = 'Sherpa!Trail9-e2e'

// The catalog is served from a 300-second cross-request cache
// (lib/cafe/catalog-cache.ts), which a row inserted straight into Postgres
// cannot invalidate. A product created fresh each run would therefore be
// invisible to the second run within that window. Pinning the fixture to one
// id and upserting it means the cached catalog is correct whether it was
// populated by this run or a previous one — and the row is left in place on
// teardown for the same reason.
const PRODUCT_ID = 'e2e00000-0000-4000-8000-000000000001'
const PRODUCT_NAME = 'E2E Test Roast'
const PRODUCT_PRICE = 900
const QUANTITY = 2
const EXPECTED_TOTAL = PRODUCT_PRICE * QUANTITY

const stamp = Date.now()
const EMAIL = `e2e-order-${stamp}@example.test`

let cafeId: string
let placedOrderId: string | null = null

test.describe('Placing an order', () => {
  // The invoice test asserts on the order the first test placed, and the whole
  // describe shares one seeded café — fullyParallel would scatter them across
  // workers, each with its own beforeAll.
  test.describe.configure({ mode: 'serial' })

  test.skip(!configured, 'Set SUPABASE_TEST_URL / _ANON_KEY / _SERVICE_ROLE_KEY — see the header of this file')
  test.skip(!browserAvailable, 'Requires a browser binary: npx playwright install, then PLAYWRIGHT_BROWSER_AVAILABLE=1')

  // The http and mobile-safari projects would re-run this whole write-and-assert
  // cycle for no extra coverage — and would collide on the café's email — so
  // this runs in one browser. The describe-level conditional skip isn't given a
  // TestInfo, hence the check inside the hook and the test.
  const wrongProject = () => test.info().project.name !== 'chromium'

  test.beforeAll(async () => {
    if (!configured || !browserAvailable || wrongProject()) return
    const admin = adminClient()

    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    })
    if (error || !data.user) throw new Error(`could not create café user: ${error?.message}`)
    cafeId = data.user.id

    // phone and delivery_address are both required before placeOrder will run —
    // an incomplete profile is refused with a different message entirely.
    const { error: cafeError } = await admin.from('cafes').insert({
      id: cafeId,
      name: `E2E Café ${stamp}`,
      contact_name: 'Test Manager',
      phone: '9800000000',
      neighborhood: 'Thamel',
      delivery_address: 'Thamel Marg 12',
      status: 'active',
    })
    if (cafeError) throw new Error(`could not create café row: ${cafeError.message}`)

    const { error: productError } = await admin.from('products').upsert({
      id: PRODUCT_ID,
      name: PRODUCT_NAME,
      category: 'Coffee',
      unit: 'kg',
      base_price: PRODUCT_PRICE,
      stock_status: 'in_stock',
      archived_at: null,
    })
    if (productError) throw new Error(`could not upsert fixture product: ${productError.message}`)
  })

  test.afterAll(async () => {
    if (!configured || !browserAvailable || wrongProject()) return
    const admin = adminClient()

    // orders cascade to order_items and invoices; the café row and its pricing
    // overrides cascade from the auth user. The fixture product stays — see the
    // note on PRODUCT_ID.
    //
    // The PDF in the bucket is the one thing no cascade reaches: storage objects
    // are not rows in a table that references the order, so deleting the invoice
    // row would leave the file behind. Read the path before the delete.
    if (placedOrderId) {
      const { data: invoice } = await admin
        .from('invoices')
        .select('pdf_path')
        .eq('order_id', placedOrderId)
        .maybeSingle()

      await admin.from('orders').delete().eq('id', placedOrderId)
      if (invoice?.pdf_path) await admin.storage.from('invoices').remove([invoice.pdf_path])
    }
    if (cafeId) await admin.auth.admin.deleteUser(cafeId)
  })

  test('a café signs in, adds a product and places an order', async ({ page }) => {
    test.skip(wrongProject(), 'chromium project only')

    // ── Sign in ─────────────────────────────────────────────────────────────
    await page.goto('/login')
    await page.locator('#email').fill(EMAIL)
    await page.locator('#password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()

    // Landing on the catalog is also the proof that the app under test is
    // talking to the same database this spec seeded: these credentials exist
    // nowhere else, so a server pointed at another project cannot get here.
    await expect(page.getByRole('heading', { name: PRODUCT_NAME })).toBeVisible({ timeout: 15_000 })

    // ── Add two of the fixture product ──────────────────────────────────────
    // Searching first narrows the grid to one card, so "Add" is unambiguous
    // without reaching into the card's DOM structure.
    await page.getByRole('textbox', { name: 'Search products' }).fill(PRODUCT_NAME)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await page.getByRole('button', { name: `Increase ${PRODUCT_NAME}` }).click()

    await expect(page.getByRole('button', { name: `Increase ${PRODUCT_NAME}` })).toBeVisible()

    // ── Place it ────────────────────────────────────────────────────────────
    await page.goto('/orders')

    const placeOrder = page.getByRole('button', { name: /^Place Order/ })
    await expect(placeOrder).toBeEnabled()
    // Cash is the default; credit is disabled unless credit_enabled is set.
    await expect(placeOrder).toContainText(EXPECTED_TOTAL.toLocaleString('en-IN'))
    await placeOrder.click()

    // ── The confirmation page ───────────────────────────────────────────────
    await page.waitForURL(/\/order\/confirm\?orderId=/, { timeout: 30_000 })
    await expect(page.getByRole('heading', { name: 'Order placed' })).toBeVisible()

    const orderId = new URL(page.url()).searchParams.get('orderId')
    expect(orderId).toBeTruthy()
    placedOrderId = orderId

    // ── What actually landed in the database ────────────────────────────────
    const admin = adminClient()

    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, cafe_id, total_amount, payment_type, status')
      .eq('id', orderId!)
      .single()

    expect(orderError).toBeNull()
    expect(order).toMatchObject({
      cafe_id: cafeId,
      total_amount: EXPECTED_TOTAL,
      payment_type: 'cash',
    })

    const { data: items, error: itemsError } = await admin
      .from('order_items')
      .select('product_id, quantity, unit_price_at_time_of_order')
      .eq('order_id', orderId!)

    expect(itemsError).toBeNull()
    expect(items).toEqual([
      {
        product_id: PRODUCT_ID,
        quantity: QUANTITY,
        unit_price_at_time_of_order: PRODUCT_PRICE,
      },
    ])
  })

  test('the invoice is generated after the response', async () => {
    test.skip(wrongProject(), 'chromium project only')

    // placeOrder renders and uploads the invoice PDF in `after()`, so it lands
    // some time *after* the café already saw a success screen. That is exactly
    // why it needs asserting: a failure here is invisible from the UI.
    expect(placedOrderId, 'the order test must have run first').toBeTruthy()
    const admin = adminClient()

    await expect
      .poll(
        async () => {
          const { data } = await admin
            .from('invoices')
            .select('invoice_number')
            .eq('order_id', placedOrderId!)
            .maybeSingle()
          return data !== null
        },
        { timeout: 60_000, intervals: [1_000], message: 'no invoice row appeared for the order' },
      )
      .toBe(true)

    const { data: invoice } = await admin
      .from('invoices')
      .select('invoice_number, pdf_path')
      .eq('order_id', placedOrderId!)
      .single()

    expect(invoice!.invoice_number).toBeTruthy()

    // The row is only half of it — the PDF itself has to be in the bucket.
    const { data: file, error: downloadError } = await admin
      .storage
      .from('invoices')
      .download(invoice!.pdf_path)

    expect(downloadError).toBeNull()
    expect(file!.size).toBeGreaterThan(0)
  })
})
