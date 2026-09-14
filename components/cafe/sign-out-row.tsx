'use client'

import { LogOut } from 'lucide-react'
import { useSignOut } from '@/lib/auth/use-sign-out'

/**
 * Signing out from the Account page.
 *
 * It already exists in Settings, but nothing on the café side points there —
 * finding it meant opening Account, then the gear icon, then scrolling past the
 * profile and password forms. This is the row people actually look for, in the
 * place they look for it.
 *
 * Flush row — belongs inside a `ListGroup`. Red rather than tiled: enough to
 * set it apart from the rows above without another card's worth of weight.
 */
export function SignOutRow() {
  const { signOut, isPending } = useSignOut()

  return (
    <button
      onClick={signOut}
      disabled={isPending}
      className="flex w-full items-center gap-3.5 px-4 py-4 text-left transition-colors hover:bg-red-50 disabled:opacity-60"
    >
      <LogOut className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
      <span className="flex-1 font-display text-base leading-none text-red-700">
        {isPending ? 'Signing out…' : 'Sign out'}
      </span>
    </button>
  )
}
