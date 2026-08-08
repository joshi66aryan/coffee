import Link from 'next/link'

interface Props {
  label: string
  value: string
  href?: string
}

export function StatCard({ label, value, href }: Props) {
  const content = (
    <div className="bg-white rounded-xl border border-gray-200 p-5 h-full hover:border-amber-300 transition-colors">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
    </div>
  )

  if (!href) return content

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  )
}
