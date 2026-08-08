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
        className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
          enabled ? 'bg-emerald-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      <span className="text-sm text-gray-700">
        Credit is {enabled ? 'enabled' : 'disabled'} for this café
      </span>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
