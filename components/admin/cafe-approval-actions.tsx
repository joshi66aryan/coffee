'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveCafe, rejectCafe } from '@/lib/admin/actions'

export function CafeApprovalActions({ cafeId }: { cafeId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleApprove() {
    setError('')
    startTransition(async () => {
      const result = await approveCafe(cafeId)
      if (result.error) { setError(result.error); return }
      router.refresh()
    })
  }

  function handleReject() {
    setError('')
    startTransition(async () => {
      const result = await rejectCafe(cafeId)
      if (result.error) { setError(result.error); return }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-2 shrink-0">
      {error && <p className="text-xs text-red-600 text-right">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleReject}
          disabled={isPending}
          className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
        >
          Reject
        </button>
        <button
          onClick={handleApprove}
          disabled={isPending}
          className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          Approve
        </button>
      </div>
    </div>
  )
}
