import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCachedUser, type AuthUser } from '@/lib/supabase/user'
import logger from '@/lib/logger'
import type { Cafe } from '@/lib/types'

/**
 * The signed-in café's profile row, fetched once per request.
 *
 * This used to run in middleware on *every* request, which meant a database
 * round trip that blocked the render before it started — and then the page
 * fetched the very same row again for itself. Middleware now only checks the
 * access token (no network at all) and the status gate lives here, next to
 * the data, where React's `cache()` collapses it to a single query no matter
 * how many callers on the page ask for it.
 *
 * Page-level rather than layout-level on purpose: a layout is not re-rendered
 * on every client-side navigation within its own segment, so it cannot be
 * relied on as a gate.
 */
export const getCafeProfile = cache(
  async (): Promise<{ user: AuthUser | null; cafe: Cafe | null }> => {
    const { user } = await getCachedUser()
    if (!user) return { user: null, cafe: null }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cafes')
      .select('*')
      .eq('id', user.id)
      .maybeSingle<Cafe>()

    if (error) {
      logger.error('Failed to load café profile', { userId: user.id, msg: error.message })
      // Falling through with `cafe: null` would read as "no profile yet" and
      // bounce an approved café into onboarding, so a failed lookup has to be
      // an error rather than an answer.
      throw new Error('Failed to load café profile')
    }

    return { user, cafe: data ?? null }
  },
)

/**
 * The gate every café page goes through: signed in, onboarded, and approved.
 * Returns the profile row so the caller doesn't have to fetch it again.
 */
export const requireActiveCafe = cache(
  async (): Promise<{ user: AuthUser; cafe: Cafe }> => {
    const { user, cafe } = await getCafeProfile()

    if (!user) redirect('/login')
    if (!cafe) redirect('/onboarding')
    if (cafe.status !== 'active') redirect('/pending')

    return { user, cafe }
  },
)
