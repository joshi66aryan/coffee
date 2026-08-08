import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CafeHeader } from '@/components/cafe/cafe-header'
import { ProfileForm } from '@/components/cafe/profile-form'
import { ChangePasswordForm } from '@/components/cafe/change-password-form'
import { SignOutButton } from '@/components/sign-out-button'
import type { Cafe } from '@/lib/types'
import logger from '@/lib/logger'

export const metadata = { title: 'Account Settings — Sherpa Sips' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: cafe, error } = await supabase
    .from('cafes')
    .select('*')
    .eq('id', user.id)
    .single<Cafe>()

  if (error || !cafe) {
    logger.error('Failed to load café settings', { userId: user.id, msg: error?.message })
    redirect('/')
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-20 sm:pb-4">
      <CafeHeader cafeName={cafe.name} />
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          ← Profile
        </Link>
        <h1 className="text-lg font-bold text-gray-900 mb-1">Account Settings</h1>

        <ProfileForm cafe={cafe} />
        <ChangePasswordForm />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Account</h2>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Phone</span>
            <span className="text-gray-900 font-medium">{cafe.phone}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Credit</span>
            <span className={cafe.credit_enabled ? 'text-emerald-600 font-medium' : 'text-gray-400'}>
              {cafe.credit_enabled ? 'Enabled' : 'Not enabled'}
            </span>
          </div>
        </div>

        <SignOutButton
          showLabel
          className="w-full flex items-center justify-center gap-2 bg-white rounded-2xl shadow-sm border border-gray-100 py-3.5 text-red-600 font-semibold text-sm hover:bg-red-50 active:bg-red-100 disabled:opacity-50 transition-colors [&_svg]:text-red-500"
        />
      </div>
    </main>
  )
}
