import { OnboardingForm } from '@/components/cafe/onboarding-form'
import { SherpaSipsLogo } from '@/components/cafe/sherpa-sips-logo'
import { MountainRidge } from '@/components/brand/mountain-ridge'
import { BeanScatter } from '@/components/brand/bean-scatter'

export const metadata = { title: 'Set Up Your Café — Sherpa Sips' }

export default function OnboardingPage() {
  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      {/* ---- Brand panel -------------------------------------------------- */}
      <section className="relative flex flex-col justify-between overflow-hidden bg-olive-600 px-6 pt-10 text-cream-200 sm:px-10 lg:w-[46%] lg:pt-16">
        <BeanScatter className="text-cream-50/6" count={4} />

        <div className="relative">
          <SherpaSipsLogo variant="horizontal" tone="mono" tagline className="h-12 text-cream-50" />
        </div>

        <div className="relative py-12 lg:py-16">
          <p className="eyebrow text-brand-400">Step one</p>
          <h1 className="display-lg mt-4 max-w-md text-cream-50">
            Set up your café
          </h1>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-cream-200/75">
            Tell us where you brew. An admin reviews and approves your account —
            usually within 24 hours.
          </p>
        </div>

        <div className="relative -mx-6 -mb-px sm:-mx-10">
          <MountainRidge className="h-16 text-brand-900 lg:h-20" />
          <div className="h-4 bg-brand-900 lg:h-8" />
        </div>
      </section>

      {/* ---- Form panel --------------------------------------------------- */}
      <section className="texture-paper flex flex-1 items-start justify-center bg-cream-100 px-5 py-12 sm:px-10 lg:items-center">
        <div className="w-full max-w-md">
          <p className="eyebrow">Café details</p>
          <h2 className="display-md mt-3 text-brand-900">Your application</h2>
          <div className="rule mt-6 mb-8" />
          <OnboardingForm />
        </div>
      </section>
    </main>
  )
}
