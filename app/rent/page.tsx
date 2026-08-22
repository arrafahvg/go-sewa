import { getCategories, getCatalogProducts } from '@/lib/data/catalog'
import { formatMoneyCompact } from '@/lib/utils/money'
import StorefrontShell from '@/components/storefront/storefront-shell'
import ProductCard from '@/components/storefront/product-card'
import { getWhatsappNumber } from '@/lib/services/settings'

export const metadata = {
  title: 'Rent — Go-Sewa',
  description: 'Rent smartphones, action cameras, 360 cameras and creator gear.',
}

export const dynamic = 'force-dynamic'

export default async function RentPage() {
  const [categories, products, whatsapp] = await Promise.all([
    getCategories(), getCatalogProducts(), getWhatsappNumber(),
  ])

  return (
    <StorefrontShell whatsapp={whatsapp}>
      <div className="mx-auto max-w-7xl px-5 pb-24 pt-10 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#e76f51]">The lineup</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">
          Rent the tech you need.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#173b3b]/60">
          Every listed device is a real tracked physical unit — availability updates live from actual rentals.
        </p>

        {/* Category filter */}
        <div className="mt-10 flex flex-wrap gap-2">
          <a
            href="/rent"
            className="rounded-full bg-[#173b3b] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
          >
            All
          </a>
          {categories.map((c) => (
            <a
              key={c.slug}
              href={`/rent?category=${c.slug}`}
              className="rounded-full border border-[#173b3b]/15 px-4 py-2 text-xs font-bold text-[#173b3b]/70 transition hover:bg-[#e4eee8]"
            >
              {c.nameEn}
            </a>
          ))}
        </div>

        {products.length === 0 ? (
          <div className="mt-16 rounded-3xl border border-dashed border-[#173b3b]/15 p-10 text-center text-sm text-[#173b3b]/60">
            No rental devices found yet. Add products in the admin dashboard.
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                name={p.name}
                slug={p.slug}
                imageUrl={p.imageUrl}
                category={p.categoryNameEn ?? 'Rental'}
                price={formatMoneyCompact(p.dailyCents)}
                deposit={p.depositCents}
              />
            ))}
          </div>
        )}
      </div>
    </StorefrontShell>
  )
}