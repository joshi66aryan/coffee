'use client'

import { useTransition } from 'react'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function SignOutButton({
  showLabel = false,
  // Default styling suits a dark brand header; light surfaces pass their own.
  className = 'flex items-center gap-2 rounded-md px-2.5 py-1.5 font-display text-sm uppercase tracking-[0.14em] text-cream-200/70 transition-colors hover:bg-cream-50/10 hover:text-cream-50 disabled:opacity-50',
}: {
  showLabel?: boolean
  className?: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleSignOut() {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.auth.signOut()
      // Hard navigation, not router.push — clears the client router cache so
      // the browser Back button can't replay a cached authenticated page.
      window.location.href = '/login'
    })
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isPending}
      className={className}
      aria-label="Sign out"
    >
      <LogOut className="w-4 h-4 shrink-0" />
      {showLabel && <span>{isPending ? 'Signing out…' : 'Sign out'}</span>}
    </button>
  )
}
