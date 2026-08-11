import { CheckCircle2 } from 'lucide-react'
import { EmptyState } from '@/components/cafe/empty-state'

export function UnpaidOrdersEmptyState() {
  return (
    <EmptyState
      icon={CheckCircle2}
      title="All paid up"
      description="You have no outstanding bills right now."
    />
  )
}
