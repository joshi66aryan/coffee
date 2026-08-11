import { BeanScatter } from '@/components/brand/bean-scatter'
import type { Cafe } from '@/lib/types'

export function ProfileHeaderCard({
  cafe,
}: {
  cafe: Pick<Cafe, 'name' | 'contact_name' | 'phone'> & { credit_enabled?: boolean }
}) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-brand-900 p-5 text-cream-200 sm:p-6">
      <BeanScatter className="text-cream-50/6" count={3} />

      <div className="relative flex items-center gap-4">
        <div className="arch-sm flex h-18 w-14 shrink-0 items-center justify-center bg-brand-400 font-display text-3xl leading-none text-brand-950">
          {cafe.name.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <p className="eyebrow-sm text-cream-200/50">Hello</p>
          <p className="mt-2 truncate font-display text-2xl leading-none text-cream-50">
            {cafe.contact_name}
          </p>
          <p className="mt-2 truncate text-sm text-cream-200/70">{cafe.name}</p>
          <p className="mt-1 text-xs text-cream-200/45">{cafe.phone}</p>
        </div>

        <span
          className={`pill shrink-0 ${
            cafe.credit_enabled ? 'bg-brand-400 text-brand-950' : 'bg-cream-50/10 text-cream-200/70'
          }`}
        >
          {cafe.credit_enabled ? 'Credit Enabled' : 'Pay per Order'}
        </span>
      </div>
    </div>
  )
}
