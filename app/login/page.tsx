import { LoginForm } from '@/components/cafe/login-form'
import { SherpaSipsLogo } from '@/components/cafe/sherpa-sips-logo'
import { MountainRidge } from '@/components/brand/mountain-ridge'
import { BeanScatter } from '@/components/brand/bean-scatter'

export const metadata = { title: 'Sign in — Sherpa Sips' }

const ALTITUDE_MARKS = [
  { label: 'Sourced', value: 'Nepal' },
  { label: 'Altitude', value: '1200m+' },
  { label: 'Batches', value: 'Small' },
]

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      {/* ---- Brand panel: bean → hills → Himalaya → peak ---------------- */}
      <section className="relative flex flex-col justify-between overflow-hidden bg-brand-900 px-6 pb-0 pt-10 text-cream-200 sm:px-10 lg:w-[54%] lg:pt-16">
        <BeanScatter className="text-cream-50/7" />

        <div className="relative">
          <SherpaSipsLogo variant="horizontal" tone="mono" tagline className="h-12 text-cream-50 lg:h-14" />
        </div>

        <div className="relative py-12 lg:py-20">
          <p className="eyebrow text-brand-400">Café supply ordering</p>
          <h1 className="display-xl mt-5 max-w-xl text-cream-50">
            Guiding you to
            <br />
            the <span className="text-brand-400">perfect</span> brew
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-cream-200/75">
            Order altitude-grown Nepalese coffee for your café — live pricing,
            stock you can trust, and delivery tracked from our roastery to your bar.
          </p>

          <dl className="mt-10 flex gap-8 sm:gap-12">
            {ALTITUDE_MARKS.map(({ label, value }) => (
              <div key={label}>
                <dt className="eyebrow-sm text-cream-200/50">{label}</dt>
                <dd className="display-sm mt-2 text-brand-400">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* The land: fertile hills rising to the ridgeline. */}
        <div className="relative -mx-6 -mb-px sm:-mx-10">
          <MountainRidge className="h-20 text-olive-600 lg:h-28" />
          <div className="h-6 bg-olive-600 lg:h-10" />
        </div>
      </section>

      {/* ---- Form panel -------------------------------------------------- */}
      <section className="texture-paper flex flex-1 items-center justify-center bg-cream-100 px-5 py-14 sm:px-10">
        <div className="w-full max-w-sm">
          <LoginForm
            initialError={error === 'oauth' ? 'Google sign-in failed — please try again.' : undefined}
          />
        </div>
      </section>
    </main>
  )
}
