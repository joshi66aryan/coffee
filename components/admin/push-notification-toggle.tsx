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
        className={`flex items-center gap-1.5 text-sm p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
          subscribed ? 'text-amber-700 bg-amber-50' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        {subscribed ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
      </button>
      {error && (
        <p className="absolute right-0 top-full mt-1 text-xs text-red-600 whitespace-nowrap bg-white px-2 py-1 rounded shadow-sm border border-red-100 z-20">
          {error}
        </p>
      )}
    </div>
  )
}
