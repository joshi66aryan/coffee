'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { usePushToggle } from '@/lib/push/use-push-toggle'

const DISMISS_KEY = 'sherpa-admin-push-prompt-dismissed'

// Browsers refuse to show the permission prompt without a click, so this is
// the closest thing to "notifications on by default": ask right away instead
// of waiting for someone to find the bell icon in the header.
export function NotificationPromptBanner({ initialSubscribed }: { initialSubscribed: boolean }) {
  const [dismissed, setDismissed] = useState(true)
  const [permission, setPermission] = useState<NotificationPermission | null>(null)
  const { subscribed, isPending, unsupported, toggle } = usePushToggle(initialSubscribed)

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1')
    if (typeof Notification !== 'undefined') setPermission(Notification.permission)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  if (unsupported || subscribed || dismissed || permission === 'denied' || permission === null) return null

  return (
    <div className="mb-6 flex items-center gap-3.5 rounded-lg border border-brand-300 border-l-4 border-l-brand-400 bg-brand-50 px-5 py-4">
      <Bell className="h-4.5 w-4.5 shrink-0 text-brand-600" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-base leading-none text-brand-900">
          Get notified about new orders
        </p>
        <p className="mt-1.5 text-xs text-gray-500">Know instantly when a café places an order.</p>
      </div>
      <button onClick={toggle} disabled={isPending} className="btn btn-primary btn-sm shrink-0">
        Enable
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 text-gray-400 transition-colors hover:text-brand-900"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
