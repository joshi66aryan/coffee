import Link from 'next/link'

interface Props {
  page: number
  total: number
  pageSize: number
  basePath: string
  q?: string
}

export function Pagination({ page, total, pageSize, basePath, q }: Props) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  function href(p: number) {
    const params = new URLSearchParams()
    params.set('page', String(p))
    if (q) params.set('q', q)
    return `${basePath}?${params.toString()}`
  }

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={href(page - 1)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-gray-700"
          >
            ← Prev
          </Link>
        ) : (
          <span className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed">
            ← Prev
          </span>
        )}
        <span className="px-2">
          {page} / {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            href={href(page + 1)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-gray-700"
          >
            Next →
          </Link>
        ) : (
          <span className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed">
            Next →
          </span>
        )}
      </div>
    </div>
  )
}
