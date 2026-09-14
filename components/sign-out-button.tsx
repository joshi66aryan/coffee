'use client'

import { LogOut } from 'lucide-react'
import { useSignOut } from '@/lib/auth/use-sign-out'

export function SignOutButton({
  showLabel = false,
  // Default styling suits a dark brand header; light surfaces pass their own.
  className = 'flex items-center gap-2 rounded-md px-2.5 py-1.5 font-display text-sm uppercase tracking-[0.14em] text-cream-200/70 transition-colors hover:bg-cream-50/10 hover:text-cream-50 disabled:opacity-50',
}: {
  showLabel?: boolean
  className?: string
}) {
  const { signOut, isPending } = useSignOut()

  return (
    <button
      onClick={signOut}
      disabled={isPending}
      className={className}
      aria-label="Sign out"
    >
      <LogOut className="w-4 h-4 shrink-0" />
      {showLabel && <span>{isPending ? 'Signing out…' : 'Sign out'}</span>}
    </button>
  )
}
