import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SherpaSipsLogo } from '@/components/cafe/sherpa-sips-logo'

export const metadata = { title: 'Terms & Conditions — Sherpa Sips' }

const CLAUSES = [
  {
    heading: 'Account use',
    body: 'By creating a Sherpa Sips account, you agree to use the platform only to place and manage supply orders on behalf of a registered café. Account access is limited to authorized staff of the café associated with the account.',
  },
  {
    heading: 'Orders and pricing',
    body: 'Orders are subject to product availability and confirmation by Sherpa Sips. Prices, delivery timelines, and payment terms may vary by café and are communicated at the time of ordering.',
  },
  {
    heading: 'Your responsibilities',
    body: 'You are responsible for keeping your account credentials secure and for the accuracy of the café profile, delivery address, and contact details you provide.',
  },
  {
    heading: 'Suspension',
    body: 'Sherpa Sips may suspend or terminate accounts that violate these terms or misuse the platform.',
  },
]

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-cream-100">
      <header className="bg-brand-900 px-4 py-6 text-cream-200 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <SherpaSipsLogo variant="horizontal" tone="mono" className="h-8 text-cream-50" />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 pb-20 sm:px-6">
        <div className="border-b border-cream-300 pb-7 pt-9">
          <Link
            href="/login"
            className="eyebrow-sm mb-5 inline-flex items-center gap-1.5 text-gray-400 transition-colors hover:text-brand-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Sign in
          </Link>
          <p className="eyebrow">Legal</p>
          <h1 className="display-lg mt-3 text-brand-900">Terms &amp; Conditions</h1>
          <p className="mt-2.5 text-sm text-gray-500">Sherpa Sips café supply ordering</p>
        </div>

        <div className="divide-y divide-cream-300">
          {CLAUSES.map(({ heading, body }, i) => (
            <section key={heading} className="flex gap-5 py-7">
              <span className="shrink-0 font-display text-2xl leading-none text-brand-400 tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h2 className="display-sm text-brand-900">{heading}</h2>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{body}</p>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
