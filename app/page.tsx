import StorefrontShell from '@/components/storefront/storefront-shell'
import StaffAdminLink from '@/components/storefront/staff-admin-link'
import FaqAccordion from '@/components/storefront/faq-accordion'
import ProductCard from '@/components/storefront/product-card'
import { Star } from 'lucide-react'
import { getCatalogProducts, getCategories, getNavCategories } from '@/lib/data/catalog'
import { formatMoneyCompact } from '@/lib/utils/money'
import { getCompanyInfo } from '@/lib/services/settings'
import { getHomeSections, getHomeSeo, listFaq, listTestimonials } from '@/lib/services/cms'
import { getDictionary, getLocale, pick } from '@/lib/i18n'
import type { HomeSection } from '@/lib/types/cms'

export async function generateMetadata() {
  const seo = await getHomeSeo()
  return {
    title: seo.seoTitle || 'Go-Sewa — Rent the tech you need',
    description: seo.seoDescription || 'Premium smartphone, camera, action camera and creator gear rentals in Bali.',
    ...(seo.noindex ? { robots: { index: false as const, follow: false as const } } : {}),
  }
}

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [categories, products, company, sections, faq, testimonials, locale, dict, navCats] = await Promise.all([
    getCategories(), getCatalogProducts(), getCompanyInfo(),
    getHomeSections(), listFaq(), listTestimonials(), getLocale(), getDictionary(), getNavCategories(),
  ])
  const featured = products.slice(0, 6)
  const hero = sections.find((s): s is Extract<HomeSection, { type: 'hero' }> => s.type === 'hero')
  const visibleFaq = faq.filter((f) => f.active)
  const visibleTestimonials = testimonials.filter((t) => t.active).slice(0, 6)

  return (
    <StorefrontShell whatsapp={company.whatsapp} company={company} dict={dict} locale={locale} adminSlot={<StaffAdminLink />} navCategories={navCats}>
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-14 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#e76f51]">{hero?.kicker ?? dict.home.heroKicker}</p>
            <h1 className="mt-4 font-serif text-5xl leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              {hero?.headline ?? dict.home.heroHeadline}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#173b3b]/65">
              {hero?.sub ?? dict.home.heroSub}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/rent" className="rounded-full bg-[#173b3b] px-7 py-4 text-sm font-bold text-white transition hover:opacity-90">{dict.home.browseDevices}</a>
            </div>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-[2rem] border border-[#173b3b]/10 shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero?.imageUrl || '/hero-placeholder.svg'}
                alt={hero?.imageAlt || 'Rental camera gear available at Go-Sewa'}
                className="aspect-[4/3] w-full object-cover"
                fetchPriority="high"
              />
            </div>
            <div className="absolute -bottom-5 -left-5 -z-10 hidden h-40 w-40 rounded-[2rem] bg-[#e4eee8] sm:block" aria-hidden />
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
            <ProductCard
              key={p.id}
              name={p.name}
              slug={p.slug}
              imageUrl={p.imageUrl}
              category={pick(locale, p.categoryNameEn ?? dict.home.rentalCategoryFallback, (p as unknown as { categoryNameId?: string }).categoryNameId ?? p.categoryNameEn ?? dict.home.rentalCategoryFallback)}
              price={formatMoneyCompact(p.dailyCents)}
              deposit={p.depositCents}
              labels={{ perDay: dict.card.perDay, deposit: dict.card.deposit, notAvailable: dict.card.notAvailable }}
              available={p.stock.freeNow > 0}
            />
          ))}
        </div>
        {products.length === 0 && (
          <div className="mt-10 rounded-3xl border border-dashed border-[#173b3b]/15 p-10 text-center text-sm text-[#173b3b]/60">
            {dict.home.emptyProductsPre}<code className="font-mono">npm run db:seed</code>{dict.home.emptyProductsPost}
          </div>
        )}
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#e76f51]">{dict.home.browseBy}</p>
          <h2 className="mt-3 font-serif text-4xl tracking-tight">{dict.home.categoriesTitle}</h2>
          <div className="mt-8 flex flex-wrap gap-3">
            {categories.map((c) => (
              <a key={c.slug} href={`/rent?category=${c.slug}`} className="rounded-full border border-[#173b3b]/15 bg-white px-6 py-3 text-sm font-bold transition hover:bg-[#e4eee8]">{pick(locale, c.nameEn, (c as unknown as { nameId?: string }).nameId ?? c.nameEn)}</a>
            ))}
          </div>
        </section>
      )}

      {visibleTestimonials.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#e76f51]">{dict.home.testimonialsKicker}</p>
          <h2 className="mt-3 font-serif text-4xl tracking-tight">{dict.home.testimonialsTitle}</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleTestimonials.map((t) => (
              <figure key={t.id} className="rounded-3xl border border-[#173b3b]/10 bg-white p-6">
                <div className="flex gap-0.5 text-[#e7b54a]">{Array.from({ length: t.rating }).map((_, i) => <Star key={i} size={15} fill="currentColor" />)}</div>
                <blockquote className="mt-3 text-sm leading-6 text-[#173b3b]/75">“{t.quote}”</blockquote>
                <figcaption className="mt-4 text-xs font-bold text-[#173b3b]/60">— {t.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {visibleFaq.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#e76f51]">{dict.home.faqKicker}</p>
          <h2 className="mt-3 font-serif text-4xl tracking-tight">{dict.home.faqTitle}</h2>
          <div className="mt-8">
            <FaqAccordion items={visibleFaq} />
          </div>
        </section>
      )}
    </StorefrontShell>
  )
}
