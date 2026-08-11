import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

/**
 * Editorial page title block. Every interior café page opens the same way —
 * small uppercase eyebrow, oversized condensed title, hairline rule — so the
 * product reads as one printed system rather than a set of screens.
 */
export function PageMasthead({
  eyebrow,
  title,
  description,
  backHref,
  backLabel = 'Back',
  action,
}: {
  eyebrow: string
  title: string
  description?: string
  backHref?: string
  backLabel?: string
  action?: React.ReactNode
}) {
  return (
    <header className="border-b border-cream-300 pb-6 pt-7 sm:pb-7 sm:pt-9">
      {backHref && (
        <Link
          href={backHref}
          className="eyebrow-sm mb-5 inline-flex items-center gap-1.5 text-gray-400 transition-colors hover:text-brand-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
      )}

      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="display-lg mt-3 text-brand-900">{title}</h1>
          {description && <p className="mt-2.5 text-sm text-gray-500">{description}</p>}
        </div>
        {action && <div className="shrink-0 pb-1">{action}</div>}
      </div>
    </header>
  )
}
