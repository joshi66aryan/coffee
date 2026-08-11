export function DisplayField({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <p className="eyebrow-sm text-gray-400">{label}</p>
      <p className="mt-2 wrap-break-word text-sm font-medium text-brand-900">{value}</p>
    </div>
  )
}
