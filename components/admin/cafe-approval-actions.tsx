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
      {error && <p className="text-right text-xs text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleReject} disabled={isPending} className="btn btn-outline btn-sm">
          Reject
        </button>
        <button onClick={handleApprove} disabled={isPending} className="btn btn-primary btn-sm">
          Approve
        </button>
      </div>
    </div>
  )
}
