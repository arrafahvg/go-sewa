import { getCategories, getCatalogProducts } from '@/lib/data/catalog'
import StorefrontShell from '@/components/storefront/storefront-shell'
import RentExplorer from '@/components/storefront/rent-explorer'
import { getCompanyInfo } from '@/lib/services/settings'
import { getDictionary, getLocale, pick } from '@/lib/i18n'

export const metadata = {
  title: 'Rent — Go-Sewa',
  description: 'Rent smartphones, action cameras, 360 cameras and creator gear.',
}

export const dynamic = 'force-dynamic'

export default async function RentPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string }>
}) {
  const [{ category }, categories, products, company, locale, dict] = await Promise.all([
    searchParams, getCategories(), getCatalogProducts(), getCompanyInfo(), getLocale(), getDictionary(),
  ])

  return (
    <StorefrontShell whatsapp={company.whatsapp} company={company} dict={dict} locale={locale}>
      <div className="mx-auto max-w-7xl px-5 pb-24 pt-10 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#e76f51]">{dict.rentPage.kicker}</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">
          {dict.rentPage.title}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#173b3b]/60">
          {dict.rentPage.subtitle}
        </p>

        <RentExplorer
          products={products}
          categories={categories}
          initialCategory={category ?? ''}
          dict={dict}
          categoryName={(c) => pick(locale, c.nameEn, (c as unknown as { nameId?: string }).nameId ?? c.nameEn)}
        />
      </div>
    </StorefrontShell>
  )
}