import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Product } from '@/lib/types'

// unstable_cache wraps the reader in production; here it passes straight
// through so the tests exercise the query and the fallback, not Next's cache.
vi.mock('next/cache', () => ({
  unstable_cache: (fn: () => Promise<unknown>) => fn,
}))

const mockCreateAdminClient = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockCreateAdminClient(),
}))

const mockLogError = vi.fn()
vi.mock('@/lib/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: (...args: unknown[]) => mockLogError(...args) },
}))

import { getCatalogProducts } from '@/lib/cafe/catalog-cache'

type CatalogClient = Parameters<typeof getCatalogProducts>[0]

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: 'Everest Blend',
    category: 'Beans',
    unit: 'kg',
    base_price: 1200,
    stock_status: 'in_stock',
    description: null,
    image_url: null,
    created_at: '2026-01-01T00:00:00Z',
    archived_at: null,
    ...overrides,
  }
}

/** A Supabase query builder stub that resolves the catalog query to `result`. */
function clientReturning(result: {
  data: Product[] | null
  error: { message: string } | null
}): CatalogClient {
  const builder = {
    from: () => builder,
    select: () => builder,
    is: () => builder,
    order: () => builder,
    returns: () => Promise.resolve(result),
  }
  return builder as unknown as CatalogClient
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getCatalogProducts', () => {
  it('serves the catalog from the shared cache rather than the caller’s client', async () => {
    const products = [makeProduct()]
    mockCreateAdminClient.mockReturnValue(clientReturning({ data: products, error: null }))
    const perRequestClient = clientReturning({ data: [], error: null })

    const result = await getCatalogProducts(perRequestClient)

    expect(result).toEqual(products)
    expect(mockCreateAdminClient).toHaveBeenCalledOnce()
  })

  it('falls back to the caller’s own query when the cached read fails', async () => {
    mockCreateAdminClient.mockReturnValue(
      clientReturning({ data: null, error: { message: 'service unavailable' } }),
    )
    const fallbackProducts = [makeProduct({ id: 'p2', name: 'Annapurna Roast' })]

    const result = await getCatalogProducts(
      clientReturning({ data: fallbackProducts, error: null }),
    )

    // A cache problem must degrade to the previous behaviour, not an empty shop.
    expect(result).toEqual(fallbackProducts)
    expect(mockLogError).toHaveBeenCalled()
  })

  it('returns an empty catalog and logs when both reads fail', async () => {
    mockCreateAdminClient.mockReturnValue(
      clientReturning({ data: null, error: { message: 'service unavailable' } }),
    )

    const result = await getCatalogProducts(
      clientReturning({ data: null, error: { message: 'still down' } }),
    )

    expect(result).toEqual([])
    expect(mockLogError).toHaveBeenCalledTimes(2)
  })
})
