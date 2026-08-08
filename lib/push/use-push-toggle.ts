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
  useEffect(() => {
    if (unsupported) return
    let cancelled = false
    hasBrowserPushSubscription().then(actuallySubscribed => {
      if (!cancelled) setSubscribed(actuallySubscribed)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
