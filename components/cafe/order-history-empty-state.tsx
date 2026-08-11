import { ClipboardList } from 'lucide-react'
import { EmptyState } from '@/components/cafe/empty-state'

export function OrderHistoryEmptyState() {
  return (
    <EmptyState
      icon={ClipboardList}
      title="No orders yet"
      description="Once you place your first order it will appear here with live delivery tracking."
      actionHref="/"
      actionLabel="Browse catalog"
    />
  )
}
