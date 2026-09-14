'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { suspendCafe, reactivateCafe, deleteCafe } from '@/lib/admin/actions'
import type { CafeStatus } from '@/lib/types'

/**
 * Freeze / unfreeze / delete for one café.
 *
 * Which of these is offered depends on the café's current state rather than the
 * buttons being shown and then refusing: only an active café can be frozen,
 * only a frozen one unfrozen. The server scopes both updates the same way, so
 * this is a convenience, not the guard.
 */
export function CafeLifecycleActions({
  cafeId,
  status,
  cafeName,
}: {
  cafeId: string
  status: CafeStatus
  cafeName: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function run(action: () => Promise<{ error?: string }>, after?: () => void) {
    setError('')
    startTransition(async () => {
      const result = await action()
      if (result.error) {
        setError(result.error)
        return
      }
      after?.()
      router.refresh()
    })
  }

  function handleFreeze() {
    if (!confirm(`Freeze ${cafeName}? They will not be able to sign in or place orders until you unfreeze them. Their order history is kept.`)) return
    run(() => suspendCafe(cafeId))
  }

  function handleUnfreeze() {
    run(() => reactivateCafe(cafeId))
  }

  function handleDelete() {
    if (!confirm(`Delete ${cafeName}? This permanently removes the café and its login. This cannot be undone.`)) return
    run(() => deleteCafe(cafeId), () => router.push('/admin/cafes'))
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {status === 'active' && (
          <button onClick={handleFreeze} disabled={isPending} className="btn btn-outline btn-sm">
            {isPending ? 'Working…' : 'Freeze café'}
          </button>
        )}

        {status === 'suspended' && (
          <button onClick={handleUnfreeze} disabled={isPending} className="btn btn-primary btn-sm">
            {isPending ? 'Working…' : 'Unfreeze café'}
          </button>
        )}

        <button
          onClick={handleDelete}
          disabled={isPending}
          className="font-display text-sm uppercase tracking-[0.12em] text-red-700 transition-colors hover:text-red-900 disabled:opacity-50"
        >
          {isPending ? 'Working…' : 'Delete café'}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 border-l-2 border-red-500 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
