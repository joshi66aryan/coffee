'use client'

import { useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { unsubscribeBrowserFromPush } from '@/lib/push/client'
import { unsubscribeFromPush } from '@/lib/push/actions'
import { clearPerAccountStorage, clearSessionOwner } from '@/lib/ui/app-storage'
import logger from '@/lib/logger'

/**
 * Drop this browser's Web Push subscription, so signing out also stops the
 * notifications.
 *
 * A push subscription outlives the session that created it — the endpoint stays
 * valid and the row stays pointed at the account that registered it — so every
 * browser the account was ever signed in on went on announcing each new order,
 * from windows nobody was signed in to. Reported as the same order arriving
 * twice on one machine: once in the browser in use, once in a browser signed
 * out weeks earlier.
 *
 * Runs *before* auth.signOut(): the row is deleted by a Server Action under the
 * caller's own RLS, which needs the session that is about to be thrown away.
 * The browser end goes first regardless, so even a failed delete ends in
 * silence — the push service answers 410 for an endpoint that has unsubscribed
 * and lib/push/send.ts prunes the row on the next send.
 *
 * Never allowed to block the sign-out itself: a browser that cannot reach the
 * push service must still be able to end its session.
 */
async function dropPushSubscription(): Promise<void> {
  try {
    const endpoint = await unsubscribeBrowserFromPush()
    if (!endpoint) return

    const { error } = await unsubscribeFromPush(endpoint)
    if (error) logger.warn('Sign-out left a push subscription row behind', { msg: error })
  } catch (err) {
    logger.warn('Failed to drop this browser’s push subscription at sign-out', {
      msg: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Signing out, for the two places that offer it.
 *
 * Shared as a hook rather than duplicated because the ending matters and is
 * easy to get subtly wrong: the notifications have to stop (see above), the
 * browser-stored state has to go (or the next café to sign in on this device
 * inherits the cart), and the navigation has to be a hard one.
 */
export function useSignOut(): { signOut: () => void; isPending: boolean } {
  const [isPending, startTransition] = useTransition()

  function signOut() {
    startTransition(async () => {
      await dropPushSubscription()

      const supabase = createClient()
      await supabase.auth.signOut()

      // The cart and the dismissal flags outlive the session otherwise, and on
      // a shared browser the next café to sign in would inherit them.
      clearPerAccountStorage()
      clearSessionOwner()

      // Hard navigation, not router.push — clears the client router cache so
      // the browser Back button can't replay a cached authenticated page.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- the hard navigation is the point
      window.location.href = '/login'
    })
  }

  return { signOut, isPending }
}
