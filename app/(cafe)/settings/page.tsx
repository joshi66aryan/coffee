import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CafeHeader } from '@/components/cafe/cafe-header'
import { PageMasthead } from '@/components/ui/page-masthead'
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
    <main className="min-h-screen bg-cream-100 pb-24 sm:pb-12">
      <CafeHeader cafeName={cafe.name} />

      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <PageMasthead
          eyebrow="Manage"
          title="Account Settings"
          backHref="/profile"
          backLabel="Account"
        />

        <div className="space-y-5 pt-6">
          {/* Identity card — arched avatar echoing the packaging silhouette. */}
          <div className="flex items-center gap-4 rounded-xl border border-cream-300 bg-white p-5">
            <div className="arch-sm flex h-16 w-13 shrink-0 items-center justify-center bg-brand-900 font-display text-2xl text-cream-50">
              {cafe.contact_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xl leading-none text-brand-900">
                {cafe.contact_name}
              </p>
              <p className="eyebrow-sm mt-2 text-brand-600">Café Manager</p>
              <p className="mt-1.5 truncate text-xs text-gray-400">{cafe.neighborhood}, Nepal</p>
            </div>
            <span
              className={`pill shrink-0 ${
                cafe.credit_enabled ? 'bg-olive-600 text-cream-100' : 'bg-cream-200 text-brand-900'
              }`}
            >
              {cafe.credit_enabled ? 'Credit Enabled' : 'Pay per Order'}
            </span>
          </div>

          <ProfileForm cafe={cafe} email={user.email ?? ''} />
          <ChangePasswordForm />

          <SignOutButton
            showLabel
            className="btn btn-outline btn-block border-red-200! text-red-700! hover:border-red-600! hover:bg-red-50!"
          />
        </div>
      </div>
    </main>
  )
}
