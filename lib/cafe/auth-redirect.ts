import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/supabase/user'
import logger from '@/lib/logger'

export async function resolvePostAuthRedirect(
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ redirect: string }> {
  const { user } = await getAuthUser(supabase)

  if (user?.app_metadata?.role === 'admin') {
    logger.info('Admin login', { userId })
    return { redirect: '/admin' }
  }

  const { data: cafe } = await supabase.from('cafes').select('status').eq('id', userId).single()

  if (!cafe) {
    logger.info('New user — redirecting to onboarding', { userId })
    return { redirect: '/onboarding' }
  }

  // Tested for active rather than listing the ways to be inactive, so a new
  // status (suspended, in 014) is barred by default instead of silently
  // falling through to the catalog.
  if (cafe.status !== 'active') {
    return { redirect: '/pending' }
  }

  logger.info('Café user login', { userId })
  return { redirect: '/' }
}
