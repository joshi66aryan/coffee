import Link from 'next/link'
import { AdminNavDesktop, AdminNavMobile } from '@/components/admin/admin-nav'
import { PushNotificationToggle } from '@/components/admin/push-notification-toggle'
import { SignOutButton } from '@/components/sign-out-button'
import { getPushSubscriptionStatus } from '@/lib/push/actions'
import { SherpaSipsLogo } from '@/components/cafe/sherpa-sips-logo'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { subscribed } = await getPushSubscriptionStatus()

  return (
    <div className="min-h-screen bg-cream-100">
      <header className="sticky top-0 z-20 bg-olive-600 text-cream-200">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/admin" className="flex shrink-0 items-center gap-2.5">
              <SherpaSipsLogo variant="icon" tone="mono" className="h-8 w-auto text-cream-50" />
              <span className="flex flex-col leading-none">
                <span className="font-display text-lg leading-none tracking-[0.02em] text-cream-50">
                  Sherpa Sips
                </span>
                <span className="eyebrow-sm mt-1 text-brand-400">Operations</span>
              </span>
            </Link>
            <AdminNavDesktop />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PushNotificationToggle initialSubscribed={subscribed} />
            <SignOutButton showLabel />
          </div>
        </div>
        <AdminNavMobile />
        <div className="h-px w-full bg-linear-to-r from-brand-400 via-brand-600 to-brand-900" />
      </header>
      {children}
    </div>
  )
}
