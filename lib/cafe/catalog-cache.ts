import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import logger from '@/lib/logger'
import type { Product } from '@/lib/types'

/** Invalidated by every admin product mutation — see lib/admin/actions.ts. */
export const PRODUCTS_CACHE_TAG = 'catalog-products'

// Direct edits in the Supabase dashboard don't go through a Server Action and
// so can't invalidate the tag. This bounds how long such a change stays
// invisible; ordinary admin edits still show up immediately.
const CATALOG_REVALIDATE_SECONDS = 300

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/** The live catalog, ordered the way the storefront renders it. */
function selectCatalog(client: SupabaseServerClient) {
  return client
    .from('products')
    .select('*')
    .is('archived_at', null)
    .order('category')
    .order('name')
    .returns<Product[]>()
}

/**
 * The product catalog, shared across every café.
 *
 * Products are identical for everyone — only `cafe_product_prices` is
 * per-café — so this belongs in a cross-request cache instead of being
 * re-queried on every home-page render. It reads through the service-role
 * client because the cached value is not tied to any one session (and the
 * `products` RLS policy grants SELECT to the `authenticated` role only);
 * nothing café-specific is stored here.
 *
 * Errors are thrown rather than swallowed so a transient failure is never
 * written into the cache as an empty catalog — `getCatalogProducts` handles
 * the fallback.
 */
const readCachedCatalog = unstable_cache(
  async (): Promise<Product[]> => {
    const { data, error } = await selectCatalog(createAdminClient())

    if (error) throw new Error(error.message)

    return data ?? []
  },
  [PRODUCTS_CACHE_TAG],
  { tags: [PRODUCTS_CACHE_TAG], revalidate: CATALOG_REVALIDATE_SECONDS },
)

/**
 * The catalog for a page render: served from the cross-request cache, falling
 * back to a direct query on the caller's own (RLS-scoped) client if the cached
 * read fails — so a cache problem degrades to the previous behaviour rather
 * than to an empty shop.
 */
export async function getCatalogProducts(
  fallbackClient: SupabaseServerClient,
): Promise<Product[]> {
  try {
    return await readCachedCatalog()
  } catch (error) {
    logger.error('Cached catalog read failed — falling back to a direct query', {
      msg: error instanceof Error ? error.message : String(error),
    })

    const { data, error: queryError } = await selectCatalog(fallbackClient)

    if (queryError) {
      logger.error('Failed to fetch catalog', { msg: queryError.message })
      return []
    }

    return data ?? []
  }
}
