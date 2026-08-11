import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

/**
 * Shared empty state. Uses the arch silhouette from the packaging rather than
 * a grey circle, so a screen with nothing in it still carries the brand.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: LucideIcon
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-cream-300 bg-white px-8 py-16 text-center">
      <span className="arch-sm mb-6 flex h-16 w-13 items-center justify-center bg-cream-200 text-brand-700">
        <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <p className="display-md text-brand-900">{title}</p>
      <p className="mt-2.5 max-w-xs text-sm leading-relaxed text-gray-500">{description}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="btn btn-primary mt-7">
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
