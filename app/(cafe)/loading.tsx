import { CafeHeader } from '@/components/cafe/cafe-header'
import { Skeleton } from '@/components/ui/skeleton'

// Every café route is server-rendered on demand and waits on Supabase before
// it can send anything. Without a boundary here the browser sits on the
// previous page for the whole round trip; with one, the shell (header, nav,
// cart badge) paints immediately and only the data area waits.
export default function CafeLoading() {
  return (
    <main className="min-h-screen bg-cream-100 pb-24 sm:pb-12">
      <CafeHeader />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-9 w-56" />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-cream-300 bg-white p-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="mt-4 h-5 w-3/4" />
              <Skeleton className="mt-2 h-4 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
