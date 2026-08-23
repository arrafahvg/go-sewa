import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f8f6f1] text-[#173b3b]">
      <div className="mx-auto max-w-2xl px-5 pb-24 pt-14 lg:px-8">
        <Skeleton className="h-8 w-48" />
        <div className="mt-6 rounded-2xl border border-[#173b3b]/10 bg-white p-6">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
          <Skeleton className="mt-6 h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  )
}