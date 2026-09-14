import { redirect } from 'next/navigation'
import { getCafeProfile } from '@/lib/cafe/require-cafe'
import { ApprovalWatcher } from '@/components/cafe/approval-watcher'
import { SignOutButton } from '@/components/sign-out-button'
import { SherpaSipsLogo } from '@/components/cafe/sherpa-sips-logo'
import { MountainRidge } from '@/components/brand/mountain-ridge'
import { BeanScatter } from '@/components/brand/bean-scatter'
import { SUPPORT_WHATSAPP_DISPLAY, SUPPORT_WHATSAPP_LINK } from '@/lib/cafe/constants'
import type { CafeStatus } from '@/lib/types'

/**
 * Everything that is not an active café lands here, so the copy is chosen by
 * status. It used to say "pending approval" unconditionally, which was already
 * wrong for a rejected café and would have been actively misleading for a
 * frozen one.
 */
const COPY: Record<Exclude<CafeStatus, 'active'>, { eyebrow: string; title: string; body: string }> = {
  pending: {
    eyebrow: 'Base camp',
    title: 'Application under review',
    body: "Your café account is pending approval. We'll get back to you within 24 hours — usually sooner during business hours.",
  },
  rejected: {
    eyebrow: 'Base camp',
    title: 'Application not approved',
    body: "We weren't able to approve this café account. If you think that's a mistake, get in touch and we'll take another look.",
  },
  suspended: {
    eyebrow: 'On hold',
    title: 'Account frozen',
    body: 'Your café account is on hold, so ordering is paused for now. Get in touch and we\'ll sort it out — your order history is safe.',
  },
}

export const metadata = { title: 'Account Pending — Sherpa Sips' }

export default async function PendingPage() {
  const { user, cafe } = await getCafeProfile()
  if (!user) redirect('/login')
  if (!cafe) redirect('/onboarding')
  if (cafe.status === 'active') redirect('/')

  const copy = COPY[cafe.status]

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-brand-900 text-cream-200">
      <ApprovalWatcher />
      <BeanScatter className="text-cream-50/6" count={5} />

      <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        <SherpaSipsLogo variant="stacked" tone="mono" tagline className="h-28 text-cream-50" />

        <p className="eyebrow mt-12 text-brand-400">{copy.eyebrow}</p>
        <h1 className="display-lg mt-4 max-w-md text-cream-50">{copy.title}</h1>
        <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-cream-200/70">
          {copy.body}
        </p>

        <a
          href={SUPPORT_WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 block w-full max-w-xs rounded-lg border border-cream-200/20 bg-cream-50/5 px-5 py-4 transition-colors hover:border-brand-400 hover:bg-cream-50/10"
        >
          <p className="eyebrow-sm text-cream-200/55">Questions? WhatsApp us</p>
          <p className="mt-2 font-display text-lg leading-none text-brand-400">
            {SUPPORT_WHATSAPP_DISPLAY}
          </p>
        </a>

        <div className="mt-8">
          <SignOutButton showLabel />
        </div>
      </div>

      <div className="relative">
        <MountainRidge className="h-20 text-olive-600 sm:h-24" />
        <div className="h-4 bg-olive-600" />
      </div>
    </main>
  )
}
