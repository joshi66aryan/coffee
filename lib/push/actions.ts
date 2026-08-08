'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import logger from '@/lib/logger'

const SubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

// The subscribed/unsubscribed state is read by the admin layout header, the
// admin dashboard banner, and the café home/settings pages — none of that is
// tied to the URL, so it needs an explicit revalidate or Next.js will keep
// serving the pre-toggle state from the router cache.
function revalidatePushStatus(role: 'admin' | 'cafe') {
  if (role === 'admin') {
    revalidatePath('/admin', 'layout')
  } else {
    revalidatePath('/')
    revalidatePath('/settings/app')
  }
}

export async function subscribeToPush(subscription: unknown): Promise<{ error?: string }> {
  const parsed = SubscriptionSchema.safeParse(subscription)
  if (!parsed.success) return { error: 'Invalid push subscription' }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  const role = user.app_metadata?.role === 'admin' ? 'admin' : 'cafe'

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      role,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth_key: parsed.data.keys.auth,
    },
    { onConflict: 'endpoint' },
  )

  if (error) {
    logger.error('Failed to save push subscription', { userId: user.id, msg: error.message })
    return { error: 'Failed to enable notifications' }
  }

  logger.info('Push subscription saved', { userId: user.id, role })
  revalidatePushStatus(role)
  return {}
}

export async function unsubscribeFromPush(endpoint: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const role = user.app_metadata?.role === 'admin' ? 'admin' : 'cafe'

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', user.id)

  if (error) {
    logger.error('Failed to remove push subscription', { userId: user.id, msg: error.message })
    return { error: error.message }
  }

  logger.info('Push subscription removed', { userId: user.id })
  revalidatePushStatus(role)
  return {}
}

export async function getPushSubscriptionStatus(): Promise<{ subscribed: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { subscribed: false }

  const { count, error } = await supabase
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (error) {
    logger.error('Failed to fetch push subscription status', { userId: user.id, msg: error.message })
    return { subscribed: false }
  }

  return { subscribed: (count ?? 0) > 0 }
}
