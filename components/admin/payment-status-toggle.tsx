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
  paid: 'bg-olive-600 text-cream-100',
  pending: 'bg-brand-400 text-brand-950',
  due: 'bg-red-600 text-cream-50',
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
      className={`pill cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50 ${PAYMENT_STATUS_CLASS[status]}`}
    >
      {isPending ? '…' : PAYMENT_STATUS_LABEL[status]}
    </button>
  )
}
