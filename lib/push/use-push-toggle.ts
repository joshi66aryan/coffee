'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  hasBrowserPushSubscription,
  isPushSupported,
  subscribeBrowserToPush,
  unsubscribeBrowserFromPush,
} from '@/lib/push/client'
import { subscribeToPush, unsubscribeFromPush } from '@/lib/push/actions'

// A page can mount more than one toggle at once (e.g. the header bell and the
// dashboard banner) — this keeps every mounted instance in sync when any one
// of them subscribes or unsubscribes, without needing a shared store.
const SUBSCRIPTION_CHANGED_EVENT = 'sherpa-push-subscription-changed'

function broadcastSubscriptionChange(subscribed: boolean) {
  window.dispatchEvent(new CustomEvent(SUBSCRIPTION_CHANGED_EVENT, { detail: subscribed }))
}

export function usePushToggle(initialSubscribed: boolean) {
  const [subscribed, setSubscribed] = useState(initialSubscribed)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const unsupported = typeof window !== 'undefined' && !isPushSupported()

  // The server only knows "this account has a subscription row somewhere,"
  // which can be stale (a different browser/device that was never cleanly
  // unsubscribed). What this browser is actually subscribed to is the source
  // of truth for what the toggle should show.
  //
  // Every path below has to end in a definite answer. Reported from a phone:
  // the switch read ON while no notification ever arrived, because the account
  // was subscribed on a laptop and nothing here ever contradicted the server's
  // `true`. A control that claims to be on is worse than one that is plainly
  // off — the café stops looking for the problem.
  useEffect(() => {
    let cancelled = false

    // A browser that cannot do push is definitively not subscribed — that is
    // every browser on iOS outside an installed home-screen app, which is
    // where the stale ON was being seen. Answered through the same promise as
    // the real check so there is one place that settles the value.
    const check = unsupported ? Promise.resolve(false) : hasBrowserPushSubscription()

    check
      .then(actuallySubscribed => {
        if (!cancelled) setSubscribed(actuallySubscribed)
      })
      // iOS Safari outside an installed app exposes a registration with no
      // usable pushManager, so the check throws rather than answering false.
      // Untreated, the rejection left the server's stale value on screen.
      .catch(() => {
        if (!cancelled) setSubscribed(false)
      })

    return () => {
      cancelled = true
    }
  }, [unsupported])

  useEffect(() => {
    function handleChange(event: Event) {
      setSubscribed((event as CustomEvent<boolean>).detail)
    }
    window.addEventListener(SUBSCRIPTION_CHANGED_EVENT, handleChange)
    return () => window.removeEventListener(SUBSCRIPTION_CHANGED_EVENT, handleChange)
  }, [])

  function toggle() {
    setError('')
    startTransition(async () => {
      try {
        if (subscribed) {
          const endpoint = await unsubscribeBrowserFromPush()
          if (endpoint) {
            const result = await unsubscribeFromPush(endpoint)
            if (result.error) throw new Error(result.error)
          }
          setSubscribed(false)
          broadcastSubscriptionChange(false)
        } else {
          const subscription = await subscribeBrowserToPush()
          const result = await subscribeToPush(subscription.toJSON())
          if (result.error) throw new Error(result.error)
          setSubscribed(true)
          broadcastSubscriptionChange(true)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return { subscribed, error, isPending, unsupported, toggle }
}
