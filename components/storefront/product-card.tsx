import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { formatMoney } from '@/lib/utils/money'

export default function ProductCard({
  name, slug, imageUrl, category, price, deposit,
}: {
  name: string
  slug: string
  imageUrl: string
  category: string
  price: string
  deposit: number
}) {
  return (
    <Link
      href={`/rent/${slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-[#173b3b]/10 bg-white transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#e4eee8]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[#173b3b]/40">
            {name}
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#173b3b]">
          {category}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-xl font-bold">{name}</h3>
          <ArrowUpRight size={18} className="mt-1 text-[#e76f51] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-lg font-bold">{price}</p>
            <p className="text-xs text-[#173b3b]/50">per day</p>
          </div>
          {deposit > 0 && (
            <p className="text-[10px] text-[#173b3b]/50">
              Deposit {formatMoney(deposit)}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}