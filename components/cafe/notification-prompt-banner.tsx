'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { usePushToggle } from '@/lib/push/use-push-toggle'

const DISMISS_KEY = 'sherpa-push-prompt-dismissed'

// Browsers refuse to show the permission prompt without a click, so this is
// the closest thing to "notifications on by default": ask right away instead
// of waiting for someone to find the toggle buried in Settings.
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
    <div className="mx-3 mt-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
      <Bell className="w-5 h-5 text-amber-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">Get notified about your orders</p>
        <p className="text-xs text-gray-500 mt-0.5">Know instantly when your order status changes.</p>
      </div>
      <button
        onClick={toggle}
        disabled={isPending}
        className="shrink-0 bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-amber-700 active:scale-95 transition-all disabled:opacity-50"
      >
        Enable
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
