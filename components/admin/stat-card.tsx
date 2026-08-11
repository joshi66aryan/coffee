import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface Props {
  label: string
  value: string
  /** Rendered small and tucked ahead of the value, e.g. a "Rs." currency
   *  mark. Kept out of `value` so a long amount doesn't wrap and orphan it. */
  prefix?: string
  href?: string
  icon: LucideIcon
}

/**
 * Dashboard statistic. The brand guide leans on oversized condensed numerals,
 * so the value carries the card and the label sits above it as a small
 * uppercase eyebrow.
 */
export function StatCard({ label, value, prefix, href, icon: Icon }: Props) {
  const content = (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-cream-300 bg-white p-5 transition-all duration-200 hover:border-brand-600 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow-sm text-gray-400">{label}</p>
        <Icon className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
      </div>

      <p className="display-stat mt-3 text-brand-900">
        {prefix && <span className="mr-1 text-[0.45em] text-brand-600">{prefix}</span>}
        {value}
      </p>

      {/* Terracotta rule that fills on hover — a quiet, tactile affordance. */}
      <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-brand-600 transition-transform duration-300 group-hover:scale-x-100" />
    </div>
  )

  if (!href) return content

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  )
}
