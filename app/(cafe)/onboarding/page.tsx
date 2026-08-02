import { OnboardingForm } from '@/components/cafe/onboarding-form'

export const metadata = { title: 'Set Up Your Café — Sherpa Sips' }

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-amber-50 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏪</div>
          <h1 className="text-2xl font-bold text-amber-900">Set Up Your Café</h1>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Tell us about your café. An admin will review and approve
            your account — usually within 24 hours.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6">
          <OnboardingForm />
        </div>
      </div>
    </main>
  )
}
