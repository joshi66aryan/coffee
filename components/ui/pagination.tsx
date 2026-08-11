import Link from 'next/link'

interface Props {
  page: number
  total: number
  pageSize: number
  basePath: string
  q?: string
  extraParams?: Record<string, string>
}

export function Pagination({ page, total, pageSize, basePath, q, extraParams }: Props) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  function href(p: number) {
    const params = new URLSearchParams(extraParams)
    params.set('page', String(p))
    if (q) params.set('q', q)
    return `${basePath}?${params.toString()}`
  }

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <nav
      aria-label="Pagination"
      className="mt-5 flex items-center justify-between gap-4 border-t border-cream-300 pt-4"
    >
      <span className="eyebrow-sm text-gray-400">
        {from}–{to} of {total}
      </span>

      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className="btn btn-outline btn-sm">
            ← Prev
          </Link>
        ) : (
          <span className="btn btn-outline btn-sm pointer-events-none opacity-40">← Prev</span>
        )}

        <span className="px-1 font-display text-sm tracking-[0.12em] text-brand-900 tabular-nums">
          {page} / {totalPages}
        </span>

        {page < totalPages ? (
          <Link href={href(page + 1)} className="btn btn-outline btn-sm">
            Next →
          </Link>
        ) : (
          <span className="btn btn-outline btn-sm pointer-events-none opacity-40">Next →</span>
        )}
      </div>
    </nav>
  )
}
