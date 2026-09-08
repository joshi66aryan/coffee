import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getCachedUser } from '@/lib/supabase/user'
import logger from '@/lib/logger'

/**
 * Whether the current user has any push subscription registered.
 *
 * Read by the admin layout header *and* the dashboard banner on the same
 * render, and by the café home page — so it is cached per request. Without
 * that, the admin dashboard ran this identical count query twice (each
 * preceded by its own auth round trip) on every load.
 *
 * Lives outside `actions.ts` because every caller is a Server Component; it
 * never needed to be exposed as a Server Action endpoint.
 */
export const getPushSubscriptionStatus = cache(
  async (): Promise<{ subscribed: boolean }> => {
    const { user } = await getCachedUser()
    if (!user) return { subscribed: false }

    const supabase = await createClient()
    const { count, error } = await supabase
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (error) {
      logger.error('Failed to fetch push subscription status', {
        userId: user.id,
        msg: error.message,
      })
      return { subscribed: false }
    }

    return { subscribed: (count ?? 0) > 0 }
  },
)
