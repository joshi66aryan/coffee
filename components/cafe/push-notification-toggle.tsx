'use client'

import { usePushToggle } from '@/lib/push/use-push-toggle'

export function PushNotificationToggle({ initialSubscribed }: { initialSubscribed: boolean }) {
  const { subscribed, error, isPending, unsupported, toggle } = usePushToggle(initialSubscribed)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Notifications</h2>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">Order status updates</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {unsupported
              ? 'Not supported in this browser.'
              : 'Get notified on this device when your order status changes.'}
          </p>
        </div>
        <button
          role="switch"
          aria-checked={subscribed}
          onClick={toggle}
          disabled={isPending || unsupported}
          className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 shrink-0 ${
            subscribed ? 'bg-amber-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              subscribed ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
