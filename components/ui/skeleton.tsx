// A neutral placeholder block for route-level loading states. Deliberately
// plain: it stands in for content that is genuinely still being fetched, so
// it should read as "not here yet", not as an animation that implies work.
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded bg-cream-300/70 ${className}`} />
}
