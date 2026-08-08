'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updatePaymentStatus } from '@/lib/admin/actions'
import type { PaymentStatus } from '@/lib/types'

const NEXT_PAYMENT_STATUS: Record<PaymentStatus, PaymentStatus> = {
  pending: 'paid',
  paid: 'due',
  due: 'pending',
}

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  paid: 'Paid',
  pending: 'Pending',
  due: 'Due',
}

const PAYMENT_STATUS_CLASS: Record<PaymentStatus, string> = {
  paid: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  due: 'bg-red-100 text-red-800',
}

export function PaymentStatusToggle({ orderId, status }: { orderId: string; status: PaymentStatus }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function cycle() {
    startTransition(async () => {
      const result = await updatePaymentStatus(orderId, NEXT_PAYMENT_STATUS[status])
      if (!result.error) router.refresh()
    })
  }

  return (
    <button
      onClick={cycle}
      disabled={isPending}
      title="Click to cycle payment status"
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium cursor-pointer disabled:opacity-50 transition-opacity ${PAYMENT_STATUS_CLASS[status]}`}
    >
      {isPending ? '…' : PAYMENT_STATUS_LABEL[status]}
    </button>
  )
}
