'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function SignOutButton({
  showLabel = false,
  className = 'flex items-center gap-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors p-1 text-sm',
}: {
  showLabel?: boolean
  className?: string
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSignOut() {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
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
