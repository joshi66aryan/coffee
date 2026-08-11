import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChevronRight, Info, MessageCircle } from 'lucide-react'
import { CafeHeader } from '@/components/cafe/cafe-header'
import { PageMasthead } from '@/components/ui/page-masthead'
import { PushNotificationToggle } from '@/components/cafe/push-notification-toggle'
import { InstallAppRow } from '@/components/cafe/install-app-row'
import { SUPPORT_WHATSAPP_LINK } from '@/lib/cafe/constants'
import { getPushSubscriptionStatus } from '@/lib/push/actions'

export const metadata = { title: 'App Settings — Sherpa Sips' }

export default async function AppSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { subscribed } = await getPushSubscriptionStatus()

  return (
    <main className="min-h-screen bg-cream-100 pb-24 sm:pb-12">
      <CafeHeader />

      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <PageMasthead
          eyebrow="Preferences"
          title="App Settings"
          backHref="/profile"
          backLabel="Account"
        />

        <div className="space-y-5 pt-6">
          <PushNotificationToggle initialSubscribed={subscribed} />

          <div className="divide-y divide-cream-200 overflow-hidden rounded-xl border border-cream-300 bg-white">
            <InstallAppRow />
            <a
              href={SUPPORT_WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3.5 px-4 py-4 transition-colors hover:bg-cream-100"
            >
              <MessageCircle className="h-4 w-4 shrink-0 text-brand-600" />
              <span className="flex-1 font-display text-base leading-none text-brand-900">
                Contact Support on WhatsApp
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-cream-400" />
            </a>
            <div className="flex items-center gap-3.5 px-4 py-4">
              <Info className="h-4 w-4 shrink-0 text-brand-600" />
              <div className="flex-1">
                <p className="font-display text-base leading-none text-brand-900">About Sherpa Sips</p>
                <p className="mt-2 text-xs text-gray-400">Café ordering app · v0.1.0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
