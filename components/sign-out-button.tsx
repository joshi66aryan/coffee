'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function SignOutButton() {
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
      className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
    >
      {isPending ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
