import { StorefrontGridSkeleton, Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f8f6f1] text-[#173b3b]">
      <div className="mx-auto max-w-7xl px-5 pb-24 pt-10 lg:px-8">
        <Skeleton className="h-3 w-24 rounded-full" />
        <div className="mt-6 flex flex-wrap gap-3">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
        <div className="mt-10">
          <StorefrontGridSkeleton cards={9} />
        </div>
      </div>
    </div>
  )
}