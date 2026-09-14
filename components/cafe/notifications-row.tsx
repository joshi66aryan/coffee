'use client'

import { Bell, BellOff } from 'lucide-react'
import { usePushToggle } from '@/lib/push/use-push-toggle'

/**
 * Turning order notifications on.
 *
 * Same problem the sign-out row fixed, and the same fix. The toggle already
 * existed, but the only permanent way to reach it was the unlabelled gear icon
 * in the Account masthead — and the one-off banner on the home page is gone for
 * good the moment it's dismissed. Between them, no café had ever turned
 * notifications on: the `push_subscriptions` table held admin rows only.
 *
 * So the switch itself goes on the page cafés actually open, rather than one
 * more link to somewhere else. It is the only permanent notification control
 * on the café side: App Settings does not repeat it.
 *
 * Flush row — belongs inside a `ListGroup`.
 */
export function NotificationsRow({ initialSubscribed }: { initialSubscribed: boolean }) {
  const { subscribed, error, isPending, unsupported, toggle } = usePushToggle(initialSubscribed)

  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-3.5">
        {subscribed ? (
          <Bell className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
        ) : (
          <BellOff className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
        )}

        <div className="min-w-0 flex-1">
          <p className="font-display text-base leading-none text-brand-900">Order notifications</p>
          <p className="mt-2 text-xs text-gray-500">
            {unsupported
              ? 'This browser can’t show notifications — install the app or use Chrome or Safari.'
              : 'Get told on this device when your order is confirmed, sent out or delivered.'}
          </p>
        </div>

        <button
          role="switch"
          aria-checked={subscribed}
          aria-label="Order notifications"
          onClick={toggle}
          disabled={isPending || unsupported}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            subscribed ? 'bg-olive-600' : 'bg-cream-300'
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              subscribed ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-red-700">{error}</p>}
    </div>
  )
}
