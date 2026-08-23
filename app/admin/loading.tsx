import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#173b3b]">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Skeleton className="h-3 w-32 rounded-full" />
        <Skeleton className="mt-3 h-8 w-56" />
        <div className="mt-6 rounded-2xl border border-[#173b3b]/10 bg-white p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </div>
      </div>
    </div>
  )
}