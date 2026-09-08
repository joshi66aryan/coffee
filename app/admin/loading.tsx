import { Skeleton } from '@/components/ui/skeleton'

// The admin header lives in the layout, so it stays put while this stands in
// for the page body. Covers the dashboard, order queue, payments, products
// and cafés — all of which are dynamic and query on every render.
export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <header className="border-b border-cream-300 py-8 sm:py-10">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-9 w-52" />
        <Skeleton className="mt-3 h-4 w-64" />
      </header>

      <div className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-cream-300 bg-white p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-28" />
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-cream-300 bg-white p-5">
        <Skeleton className="h-4 w-40" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
