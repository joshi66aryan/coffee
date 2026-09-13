import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, cache: <T,>(fn: T) => fn }
})

const mockGetCachedUser = vi.fn()
vi.mock('@/lib/supabase/user', () => ({ getCachedUser: () => mockGetCachedUser() }))
vi.mock('@/lib/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
vi.mock('next/server', () => ({ after: vi.fn() }))
vi.mock('@/lib/invoice/generate', () => ({ generateInvoiceForOrder: vi.fn() }))
vi.mock('@/lib/push/send', () => ({ sendPushToAdmins: vi.fn() }))

const mockConsumeRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({
  consumeRateLimit: (...args: unknown[]) => mockConsumeRateLimit(...args),
  retryAfterMessage: () => 'Please try again in a minute.',
}))

const CAFE_ID = '22222222-2222-4222-8222-222222222222'
const OTHER_CAFE_ID = '99999999-9999-4999-8999-999999999999'
const PRODUCT_ID = '33333333-3333-4333-8333-333333333333'
const ORDER_ID = '11111111-1111-4111-8111-111111111111'

// Records every write so a test can assert on what actually reached the
// database, and every filter so invoice scoping can be checked.
interface Recorded {
  inserts: { table: string; payload: unknown }[]
  rpcs: { fn: string; args: Record<string, unknown> }[]
  filters: { column: string; value: unknown }[]
}

let recorded: Recorded
let tableData: Record<string, unknown>
let signedUrlResult: unknown
let rpcResult: unknown

function makeQuery(table: string) {
  const query: Record<string, unknown> = {}
  const chain = () => query
  const result = () => tableData[table] ?? { data: null, error: null }

  Object.assign(query, {
    select: chain,
    is: chain,
    in: chain,
    order: chain,
    returns: chain,
    eq: (column: string, value: unknown) => {
      recorded.filters.push({ column, value })
      return query
    },
    single: async () => result(),
    maybeSingle: async () => result(),
    insert: (payload: unknown) => {
      recorded.inserts.push({ table, payload })
      return { ...query, then: undefined, select: chain }
    },
    then: (resolve: (v: unknown) => void) => resolve(result()),
  })

  return query
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => makeQuery(table),
    storage: {
      from: () => ({ createSignedUrl: async () => signedUrlResult }),
    },
  }),
}))

// The order write now goes through the service-role client, which is the only
// role migration 013 grants EXECUTE on create_order_with_items. Recording the
// RPC is how these tests see what was actually written.
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => {
      recorded.rpcs.push({ fn, args })
      return rpcResult
    },
  }),
}))

const { placeOrder, getInvoiceDownloadUrl } = await import('@/lib/cafe/order-actions')

beforeEach(() => {
  vi.clearAllMocks()
  recorded = { inserts: [], rpcs: [], filters: [] }
  mockConsumeRateLimit.mockResolvedValue({ allowed: true, retryAfter: 0 })
  mockGetCachedUser.mockResolvedValue({
    user: { id: CAFE_ID, email: null, app_metadata: {} },
    error: null,
  })
  tableData = {
    cafes: {
      data: {
        name: 'Base Camp Coffee',
        status: 'active',
        credit_enabled: false,
        phone: '9800000000',
        delivery_address: 'Thamel Marg 12',
      },
      error: null,
    },
    products: {
      data: [
        {
          id: PRODUCT_ID,
          name: 'Everest Dark Roast',
          base_price: 900,
          stock_status: 'in_stock',
          archived_at: null,
        },
      ],
      error: null,
    },
    cafe_product_prices: { data: [], error: null },
  }
  rpcResult = { data: ORDER_ID, error: null }
  signedUrlResult = { data: { signedUrl: 'https://storage.example/signed' }, error: null }
})

/** Arguments the order-writing function was called with, if it was called. */
function orderRpc() {
  return recorded.rpcs.find(r => r.fn === 'create_order_with_items')?.args as
    | {
        p_cafe_id: string
        p_payment_type: string
        p_total_amount: number
        p_items: { product_id: string; quantity: number; unit_price_at_time_of_order: number }[]
      }
    | undefined
}

/** True when nothing at all was written — no RPC and no direct insert. */
function nothingWasWritten() {
  return recorded.rpcs.length === 0 && recorded.inserts.length === 0
}

describe('placeOrder — pricing is never taken from the client', () => {
  it('prices the order from the database, ignoring a price sent in the request', async () => {
    const result = await placeOrder({
      items: [{ product_id: PRODUCT_ID, quantity: 2, price: 1 }],
      payment_type: 'cash',
    } as never)

    expect(result).toEqual({ orderId: ORDER_ID })
    // 900 from the products row, not the 1 the caller asked for.
    expect(orderRpc()?.p_items[0].unit_price_at_time_of_order).toBe(900)
    expect(orderRpc()?.p_total_amount).toBe(1800)
  })

  it('prefers this café’s negotiated override over the base price', async () => {
    tableData.cafe_product_prices = {
      data: [{ product_id: PRODUCT_ID, custom_price: 750 }],
      error: null,
    }

    await placeOrder({ items: [{ product_id: PRODUCT_ID, quantity: 2 }], payment_type: 'cash' })

    expect(orderRpc()?.p_items[0].unit_price_at_time_of_order).toBe(750)
    expect(orderRpc()?.p_total_amount).toBe(1500)
  })

  it('records the order against the authenticated café, not a supplied cafe_id', async () => {
    await placeOrder({
      items: [{ product_id: PRODUCT_ID, quantity: 1 }],
      payment_type: 'cash',
      cafe_id: OTHER_CAFE_ID,
    } as never)

    expect(orderRpc()?.p_cafe_id).toBe(CAFE_ID)
  })

  it('never forwards a client-supplied payment_status to the database', async () => {
    await placeOrder({
      items: [{ product_id: PRODUCT_ID, quantity: 1 }],
      payment_type: 'cash',
      payment_status: 'paid',
    } as never)

    // The column is not a parameter of create_order_with_items at all — the
    // function hard-codes 'pending' — so the client's value has nowhere to go.
    expect(Object.keys(orderRpc() ?? {})).not.toContain('payment_status')
    expect(JSON.stringify(orderRpc())).not.toContain('paid')
  })
})

describe('placeOrder — the café session never writes order rows itself', () => {
  it('writes the order and its items through one privileged call, not two client inserts', async () => {
    await placeOrder({
      items: [
        { product_id: PRODUCT_ID, quantity: 2 },
        { product_id: PRODUCT_ID, quantity: 3 },
      ],
      payment_type: 'cash',
    })

    // Migration 013 revokes INSERT on both tables from `authenticated`, so an
    // insert issued through the café's own session would now fail outright —
    // and, before it was revoked, was what let a café append free line items
    // to an order it had already placed.
    expect(recorded.inserts.filter(i => i.table === 'orders')).toHaveLength(0)
    expect(recorded.inserts.filter(i => i.table === 'order_items')).toHaveLength(0)
    expect(recorded.rpcs).toHaveLength(1)
    expect(orderRpc()?.p_items).toHaveLength(2)
  })

  it('reports a failure rather than leaving an order without its line items', async () => {
    rpcResult = { data: null, error: { message: 'transaction rolled back' } }

    const result = await placeOrder({
      items: [{ product_id: PRODUCT_ID, quantity: 1 }],
      payment_type: 'cash',
    })

    expect(result).toEqual({ error: 'Failed to place order. Please try again.' })
  })
})

describe('placeOrder — rate limiting', () => {
  it('refuses to write anything once the café is over its limit', async () => {
    mockConsumeRateLimit.mockResolvedValue({ allowed: false, retryAfter: 60 })

    const result = await placeOrder({
      items: [{ product_id: PRODUCT_ID, quantity: 1 }],
      payment_type: 'cash',
    })

    expect(result).toHaveProperty('error')
    expect(nothingWasWritten()).toBe(true)
  })

  it('meters the authenticated café, not a value the caller controls', async () => {
    await placeOrder({ items: [{ product_id: PRODUCT_ID, quantity: 1 }], payment_type: 'cash' })

    expect(mockConsumeRateLimit).toHaveBeenCalledWith('placeOrder', CAFE_ID)
  })
})

describe('placeOrder — input validation', () => {
  it('rejects a non-UUID product id', async () => {
    const result = await placeOrder({
      items: [{ product_id: 'not-a-uuid', quantity: 1 }],
      payment_type: 'cash',
    })

    expect(result).toHaveProperty('error')
    expect(nothingWasWritten()).toBe(true)
  })

  it.each([0, -5, 1.5, 2_147_483_647])('rejects quantity %s', async quantity => {
    const result = await placeOrder({
      items: [{ product_id: PRODUCT_ID, quantity }],
      payment_type: 'cash',
    })

    expect(result).toHaveProperty('error')
    expect(nothingWasWritten()).toBe(true)
  })

  it('rejects an order with more line items than any real order has', async () => {
    const result = await placeOrder({
      items: Array.from({ length: 101 }, () => ({ product_id: PRODUCT_ID, quantity: 1 })),
      payment_type: 'cash',
    })

    expect(result).toEqual({ error: 'Order has too many line items' })
    expect(nothingWasWritten()).toBe(true)
  })

  it('rejects an unknown payment type', async () => {
    const result = await placeOrder({
      items: [{ product_id: PRODUCT_ID, quantity: 1 }],
      payment_type: 'invoice_later' as never,
    })

    expect(result).toHaveProperty('error')
    expect(nothingWasWritten()).toBe(true)
  })

  it('rejects a total that would overflow the column', async () => {
    tableData.products = {
      data: [{ id: PRODUCT_ID, name: 'Bulk', base_price: 5_000_000, stock_status: 'in_stock' }],
      error: null,
    }

    const result = await placeOrder({
      items: [{ product_id: PRODUCT_ID, quantity: 10 }],
      payment_type: 'cash',
    })

    expect(result).toHaveProperty('error')
    expect(orderRpc()).toBeUndefined()
  })
})

describe('placeOrder — account state is read from the database', () => {
  it('refuses an order from a café that has not been approved', async () => {
    tableData.cafes = {
      data: { name: 'X', status: 'pending', credit_enabled: false, phone: '98', delivery_address: 'a' },
      error: null,
    }

    const result = await placeOrder({
      items: [{ product_id: PRODUCT_ID, quantity: 1 }],
      payment_type: 'cash',
    })

    expect(result).toEqual({ error: 'Your account is not active' })
    expect(nothingWasWritten()).toBe(true)
  })

  it('refuses credit terms the café has not been granted', async () => {
    const result = await placeOrder({
      items: [{ product_id: PRODUCT_ID, quantity: 1 }],
      payment_type: 'credit',
    })

    expect(result).toEqual({ error: 'Credit is not available for your account yet' })
    expect(nothingWasWritten()).toBe(true)
  })

  it('refuses an order for a product that is not in the catalog', async () => {
    tableData.products = { data: [], error: null }

    const result = await placeOrder({
      items: [{ product_id: PRODUCT_ID, quantity: 1 }],
      payment_type: 'cash',
    })

    expect(result).toEqual({ error: 'One or more products not found' })
    expect(nothingWasWritten()).toBe(true)
  })

  it('rejects an unauthenticated caller', async () => {
    mockGetCachedUser.mockResolvedValue({ user: null, error: null })

    const result = await placeOrder({
      items: [{ product_id: PRODUCT_ID, quantity: 1 }],
      payment_type: 'cash',
    })

    expect(result).toEqual({ error: 'Not authenticated' })
    expect(nothingWasWritten()).toBe(true)
  })
})

describe('getInvoiceDownloadUrl — IDOR', () => {
  it('scopes the lookup to the caller’s own café, not just the order id', async () => {
    tableData.invoices = {
      data: { invoice_number: 'INV-001', pdf_path: `${CAFE_ID}/${ORDER_ID}.pdf` },
      error: null,
    }

    await getInvoiceDownloadUrl(ORDER_ID)

    // The order id alone must not be the only thing identifying the row.
    expect(recorded.filters).toContainEqual({ column: 'orders.cafe_id', value: CAFE_ID })
    expect(recorded.filters).toContainEqual({ column: 'order_id', value: ORDER_ID })
  })

  it('returns nothing for an order belonging to another café', async () => {
    // What the scoped query returns once the café filter excludes the row.
    tableData.invoices = { data: null, error: { code: 'PGRST116', message: 'no rows' } }

    await expect(getInvoiceDownloadUrl(ORDER_ID)).resolves.toBeNull()
  })

  it('returns nothing to an unauthenticated caller', async () => {
    mockGetCachedUser.mockResolvedValue({ user: null, error: null })

    await expect(getInvoiceDownloadUrl(ORDER_ID)).resolves.toBeNull()
  })
})
