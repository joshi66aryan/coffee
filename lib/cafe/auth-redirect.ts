import { createClient } from '@/lib/supabase/server'
import logger from '@/lib/logger'

export async function resolvePostAuthRedirect(
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ redirect: string }> {
  if ((await supabase.auth.getUser()).data.user?.app_metadata?.role === 'admin') {
    logger.info('Admin login', { userId })
    return { redirect: '/admin' }
  }

  const { data: cafe } = await supabase.from('cafes').select('status').eq('id', userId).single()

  if (!cafe) {
    logger.info('New user — redirecting to onboarding', { userId })
    return { redirect: '/onboarding' }
  }

  if (cafe.status === 'pending' || cafe.status === 'rejected') {
    return { redirect: '/pending' }
  }

  logger.info('Café user login', { userId })
  return { redirect: '/' }
}
