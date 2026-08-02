import { createServerClient } from '@supabase/ssr'

// Server-only client using the service role key — bypasses RLS.
// Never import this in client components or expose to the browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase admin credentials (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)')
  }

  return createServerClient(url, key, {
    cookies: { getAll: () => [], setAll: () => {} },
  })
}
