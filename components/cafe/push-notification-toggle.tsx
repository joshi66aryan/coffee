'use client'

import { usePushToggle } from '@/lib/push/use-push-toggle'

export function PushNotificationToggle({ initialSubscribed }: { initialSubscribed: boolean }) {
  const { subscribed, error, isPending, unsupported, toggle } = usePushToggle(initialSubscribed)

  return (
    <div className="rounded-xl border border-cream-300 bg-white p-5">
      <h2 className="eyebrow mb-4">Notifications</h2>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-base leading-none text-brand-900">Order status updates</p>
          <p className="mt-2 text-xs text-gray-500">
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
