import StorefrontShell from '@/components/storefront/storefront-shell'
import { getCatalogProducts, getCategories } from '@/lib/data/catalog'
import { formatMoneyCompact } from '@/lib/utils/money'
import { getWhatsappNumber } from '@/lib/services/settings'

export const metadata = {
  title: 'Go-Sewa — Rent the tech you need',
  description: 'Premium smartphone, camera, action camera and creator gear rentals in Bali.',
}

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [categories, products, whatsapp] = await Promise.all([
    getCategories(), getCatalogProducts(), getWhatsappNumber(),
  ])
  const featured = products.slice(0, 6)

  return (
    <StorefrontShell whatsapp={whatsapp}>
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-14 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#e76f51]">Rent the tech you need, when you need it.</p>
          <h1 className="mt-4 font-serif text-5xl leading-tight tracking-tight sm:text-7xl">
            Choose your gear.<br />
            <em className="font-normal text-[#3d6b63]">Book it. Enjoy.</em>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#173b3b]/65">
            Rent premium smartphones, action cameras, 360 cameras and creator gear for your trip, project, adventure or content.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/rent" className="rounded-full bg-[#173b3b] px-7 py-4 text-sm font-bold text-white transition hover:opacity-90">Browse devices</a>
            <a href="/rent?category=action-cameras" className="rounded-full border border-[#173b3b]/15 bg-white px-7 py-4 text-sm font-bold transition hover:bg-[#e4eee8]">Browse cameras</a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#e76f51]">The lineup</p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight">Featured devices</h2>
          </div>
          <a href="/rent" className="text-sm font-bold text-[#387066] underline-offset-4 hover:underline">View all →</a>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => (
            <a key={p.id} href={`/rent/${p.slug}`} className="rounded-3xl border border-[#173b3b]/10 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-[#e4eee8] text-sm font-bold text-[#173b3b]/40">{p.name}</div>
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">{p.categoryNameEn}</p>
                <h3 className="mt-1 font-serif text-xl font-bold">{p.name}</h3>
                <p className="mt-2 text-lg font-bold">{p.dailyCents ? formatMoneyCompact(p.dailyCents) : '—'}<span className="text-xs font-normal text-[#173b3b]/50"> / day</span></p>
              </div>
            </a>
          ))}
        </div>
        {products.length === 0 && (
          <div className="mt-10 rounded-3xl border border-dashed border-[#173b3b]/15 p-10 text-center text-sm text-[#173b3b]/60">
            No rental devices found yet. Add products and run <code className="font-mono">npm run db:seed</code>.
          </div>
        )}
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#e76f51]">Browse by</p>
          <h2 className="mt-3 font-serif text-4xl tracking-tight">Categories</h2>
          <div className="mt-8 flex flex-wrap gap-3">
            {categories.map((c) => (
              <a key={c.slug} href={`/rent?category=${c.slug}`} className="rounded-full border border-[#173b3b]/15 bg-white px-6 py-3 text-sm font-bold transition hover:bg-[#e4eee8]">{c.nameEn}</a>
            ))}
          </div>
        </section>
      )}
    </StorefrontShell>
  )
}
