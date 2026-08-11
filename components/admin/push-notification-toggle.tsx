'use client'

import { Bell, BellOff } from 'lucide-react'
import { usePushToggle } from '@/lib/push/use-push-toggle'

export function PushNotificationToggle({ initialSubscribed }: { initialSubscribed: boolean }) {
  const { subscribed, error, isPending, unsupported, toggle } = usePushToggle(initialSubscribed)

  if (unsupported) return null

  return (
    <div className="relative">
      <button
        onClick={toggle}
        disabled={isPending}
        aria-pressed={subscribed}
        title={subscribed ? 'Disable new order notifications' : 'Enable new order notifications'}
        className={`flex items-center gap-1.5 rounded-md p-2 transition-colors disabled:opacity-50 ${
          subscribed
            ? 'bg-brand-400/15 text-brand-400'
            : 'text-cream-200/60 hover:bg-cream-50/10 hover:text-cream-50'
        }`}
      >
        {subscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
      </button>
      {error && (
        <p className="absolute right-0 top-full z-20 mt-1.5 whitespace-nowrap rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs text-red-700 shadow-md">
          {error}
        </p>
      )}
    </div>
  )
}
