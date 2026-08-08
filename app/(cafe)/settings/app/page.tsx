import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Info, MessageCircle } from 'lucide-react'
import { CafeHeader } from '@/components/cafe/cafe-header'
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
    <main className="min-h-screen bg-gray-50 pb-20 sm:pb-4">
      <CafeHeader />
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Profile
        </Link>

        <h1 className="text-lg font-bold text-gray-900">App Settings</h1>

        <PushNotificationToggle initialSubscribed={subscribed} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
          <InstallAppRow />
          <a
            href={SUPPORT_WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="flex-1 text-sm font-medium text-gray-900">Contact Support on WhatsApp</span>
            <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
          </a>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Info className="w-4 h-4 text-gray-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">About Sherpa Sips</p>
              <p className="text-xs text-gray-400 mt-0.5">Café ordering app · v0.1.0</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
