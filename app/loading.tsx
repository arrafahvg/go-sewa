import { StorefrontGridSkeleton, Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f8f6f1] text-[#173b3b]">
      <div className="mx-auto max-w-7xl px-5 pb-24 pt-14 lg:px-8">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-6 h-12 w-3/4 max-w-xl" />
        <Skeleton className="mt-4 h-5 w-2/3 max-w-md" />
        <div className="mt-10 flex flex-wrap gap-3">
          <Skeleton className="h-12 w-36 rounded-full" />
          <Skeleton className="h-12 w-40 rounded-full" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-9 w-56" />
        <div className="mt-10">
          <StorefrontGridSkeleton cards={6} />
        </div>
      </div>
    </div>
  )
}