import { AdminNavDesktop, AdminNavMobile } from '@/components/admin/admin-nav'
import { PushNotificationToggle } from '@/components/admin/push-notification-toggle'
import { SignOutButton } from '@/components/sign-out-button'
import { getPushSubscriptionStatus } from '@/lib/push/actions'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { subscribed } = await getPushSubscriptionStatus()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <span className="font-bold text-amber-700 text-sm tracking-wide uppercase">
              Sherpa Sips Admin
            </span>
            <AdminNavDesktop />
          </div>
          <div className="flex items-center gap-2">
            <PushNotificationToggle initialSubscribed={subscribed} />
            <SignOutButton showLabel />
          </div>
        </div>
        <AdminNavMobile />
      </header>
      {children}
    </div>
  )
}
