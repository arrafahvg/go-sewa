import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f8f6f1] text-[#173b3b]">
      <div className="mx-auto max-w-7xl px-5 pb-24 pt-10 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Skeleton className="aspect-[4/3] w-full rounded-3xl bg-[#e4eee8]" />
            <Skeleton className="mt-6 h-3 w-28" />
            <Skeleton className="mt-3 h-9 w-2/3" />
            <Skeleton className="mt-4 h-5 w-full" />
            <Skeleton className="mt-2 h-5 w-3/4" />
          </div>
          <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
            <Skeleton className="mt-6 h-12 w-full rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}