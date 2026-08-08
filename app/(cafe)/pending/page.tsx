import { ApprovalWatcher } from '@/components/cafe/approval-watcher'
import { SignOutButton } from '@/components/sign-out-button'
import { SUPPORT_WHATSAPP_DISPLAY, SUPPORT_WHATSAPP_LINK } from '@/lib/cafe/constants'

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
        <a
          href={SUPPORT_WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-white rounded-xl border border-amber-100 p-4 text-sm text-gray-500 hover:border-amber-200 transition-colors"
        >
          <p>Questions? Reach us on WhatsApp:</p>
          <p className="font-medium text-gray-700 mt-1">{SUPPORT_WHATSAPP_DISPLAY}</p>
        </a>
        <div className="mt-6">
          <SignOutButton />
        </div>
      </div>
    </main>
  )
}
