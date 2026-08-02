import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'
import type { Cafe } from '@/lib/types'

export const metadata = { title: 'Home — Sherpa Sips' }

export default async function CafeHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: cafe } = await supabase
    .from('cafes')
    .select('*')
    .eq('id', user!.id)
    .single<Cafe>()

  return (
    <main className="min-h-screen bg-amber-50">
      <header className="bg-white border-b border-amber-100 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-amber-900">☕ Sherpa Sips</h1>
          {cafe && <p className="text-xs text-gray-500">{cafe.name}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Profile
          </Link>
          <SignOutButton />
        </div>
      </header>

      <div className="max-w-sm mx-auto px-4 py-8 space-y-4">
        {/* Repeat Last Order — primary CTA, coming in next feature */}
        <div className="bg-amber-600 rounded-2xl p-6 text-white text-center">
          <div className="text-3xl mb-2">🔁</div>
          <h2 className="text-lg font-bold mb-1">Repeat Last Order</h2>
          <p className="text-amber-200 text-sm">Available once you place your first order</p>
        </div>

        <nav className="grid grid-cols-2 gap-3">
          <Link
            href="/catalog"
            className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:border-amber-300 transition-colors"
          >
            <div className="text-2xl mb-1">📦</div>
            <p className="text-sm font-medium text-gray-700">Browse Catalog</p>
          </Link>
          <Link
            href="/orders"
            className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:border-amber-300 transition-colors"
          >
            <div className="text-2xl mb-1">📋</div>
            <p className="text-sm font-medium text-gray-700">My Orders</p>
          </Link>
        </nav>
      </div>
    </main>
  )
}
