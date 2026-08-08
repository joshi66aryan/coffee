import { WifiOff } from 'lucide-react'

export const metadata = { title: 'Offline — Sherpa Sips' }

// Served by the service worker's navigation fallback (public/sw.js) when a
// page request fails with no network — never reached through normal
// routing, so it stays outside (cafe)/admin and skips auth entirely
// (see proxy.ts matcher) so it works regardless of login state.
export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
        <WifiOff className="w-6 h-6 text-amber-600" />
      </div>
      <h1 className="text-lg font-bold text-gray-900">You&apos;re offline</h1>
      <p className="text-sm text-gray-500 mt-1 max-w-xs">
        Sherpa Sips needs a connection to load your orders and catalog. Check your connection and try again.
      </p>
      {/* Plain anchor, not next/link — this needs a real network round-trip
          through the service worker's fetch handler, not a client-side
          router transition. */}
      <a
        href="/"
        className="mt-5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
      >
        Try Again
      </a>
    </main>
  )
}
