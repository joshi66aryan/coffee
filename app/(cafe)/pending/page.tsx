import { ApprovalWatcher } from '@/components/cafe/approval-watcher'
import { SignOutButton } from '@/components/sign-out-button'

export const metadata = { title: 'Account Pending — Sherpa Sips' }

export default function PendingPage() {
  return (
    <main className="min-h-screen bg-amber-50 flex items-center justify-center px-4">
      <ApprovalWatcher />

      <div className="w-full max-w-sm text-center">
        <div className="text-6xl mb-6">⏳</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Application Under Review
        </h1>
        <p className="text-gray-600 mb-6 leading-relaxed">
          Your café account is pending approval. We&apos;ll get back to you within
          24 hours — usually sooner during business hours.
        </p>
        <div className="bg-white rounded-xl border border-amber-100 p-4 text-sm text-gray-500">
          <p>Questions? Reach us on WhatsApp:</p>
          <p className="font-medium text-gray-700 mt-1">+977 9841-000000</p>
        </div>
        <div className="mt-6">
          <SignOutButton />
        </div>
      </div>
    </main>
  )
}
