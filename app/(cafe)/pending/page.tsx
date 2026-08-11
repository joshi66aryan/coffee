import { ApprovalWatcher } from '@/components/cafe/approval-watcher'
import { SignOutButton } from '@/components/sign-out-button'
import { SherpaSipsLogo } from '@/components/cafe/sherpa-sips-logo'
import { MountainRidge } from '@/components/brand/mountain-ridge'
import { BeanScatter } from '@/components/brand/bean-scatter'
import { SUPPORT_WHATSAPP_DISPLAY, SUPPORT_WHATSAPP_LINK } from '@/lib/cafe/constants'

export const metadata = { title: 'Account Pending — Sherpa Sips' }

export default function PendingPage() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-brand-900 text-cream-200">
      <ApprovalWatcher />
      <BeanScatter className="text-cream-50/6" count={5} />

      <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        <SherpaSipsLogo variant="stacked" tone="mono" tagline className="h-28 text-cream-50" />

        <p className="eyebrow mt-12 text-brand-400">Base camp</p>
        <h1 className="display-lg mt-4 max-w-md text-cream-50">
          Application under review
        </h1>
        <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-cream-200/70">
          Your café account is pending approval. We&apos;ll get back to you within
          24 hours — usually sooner during business hours.
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
