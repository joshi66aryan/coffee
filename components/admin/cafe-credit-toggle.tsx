'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateCafeCreditEnabled } from '@/lib/admin/actions'

export function CafeCreditToggle({ cafeId, enabled }: { cafeId: string; enabled: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleToggle() {
    setError('')
    startTransition(async () => {
      const result = await updateCafeCreditEnabled(cafeId, !enabled)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-3">
      <button
        role="switch"
        aria-checked={enabled}
        onClick={handleToggle}
        disabled={isPending}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          enabled ? 'bg-olive-600' : 'bg-cream-300'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      <span className="text-sm text-gray-600">
        Credit is {enabled ? 'enabled' : 'disabled'} for this café
      </span>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  )
}
