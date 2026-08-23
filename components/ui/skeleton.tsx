/**
 * Skeleton loaders for streaming route fallbacks (§67 — good loading states,
 * skeleton loaders). These only render while a route is loading, then are
 * swapped out by the real page. They are deliberately lightweight and inert.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[#173b3b]/10 ${className}`} aria-hidden />
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-3xl border border-[#173b3b]/10 bg-white p-6">
      <Skeleton className="aspect-[4/3] w-full rounded-2xl bg-[#e4eee8]" />
      <Skeleton className="mt-4 h-3 w-20" />
      <Skeleton className="mt-2 h-5 w-32" />
      <Skeleton className="mt-3 h-4 w-24" />
    </div>
  )
}

export function StorefrontGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}