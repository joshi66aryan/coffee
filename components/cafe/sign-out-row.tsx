'use client'

import { LogOut } from 'lucide-react'
import { useSignOut } from '@/lib/auth/use-sign-out'

/**
 * Signing out from the Account page.
 *
 * It already exists in Settings, but nothing on the café side points there —
 * finding it meant opening Account, then the gear icon, then scrolling past the
 * profile and password forms. This is the row people actually look for, in the
 * place they look for it, styled to match the other rows on the page.
 */
export function SignOutRow() {
  const { signOut, isPending } = useSignOut()

  return (
    <button
      onClick={signOut}
      disabled={isPending}
      className="flex w-full items-center gap-3.5 rounded-xl border border-cream-300 bg-white px-4 py-4 text-left transition-colors hover:border-red-600 hover:bg-red-50 disabled:opacity-60"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
        <LogOut className="h-4 w-4" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-display text-base leading-none text-brand-900">
          {isPending ? 'Signing out…' : 'Sign out'}
        </p>
        <p className="mt-2 text-xs text-gray-500">You&apos;ll need your password to sign back in</p>
      </div>
    </button>
  )
}
