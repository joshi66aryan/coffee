'use client'

import { useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { clearPerAccountStorage, clearSessionOwner } from '@/lib/ui/app-storage'

/**
 * Signing out, for the two places that offer it.
 *
 * Shared as a hook rather than duplicated because the ending matters and is
 * easy to get subtly wrong: the browser-stored state has to go (or the next
 * café to sign in on this device inherits the cart), and the navigation has to
 * be a hard one.
 */
export function useSignOut(): { signOut: () => void; isPending: boolean } {
  const [isPending, startTransition] = useTransition()

  function signOut() {
    startTransition(async () => {
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
