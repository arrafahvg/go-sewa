import { getCategories, getCatalogProducts, getNavCategories } from '@/lib/data/catalog'
import StorefrontShell from '@/components/storefront/storefront-shell'
import StaffAdminLink from '@/components/storefront/staff-admin-link'
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
  const [{ category }, categories, products, company, locale, dict, navCats] = await Promise.all([
    searchParams, getCategories(), getCatalogProducts(), getCompanyInfo(), getLocale(), getDictionary(), getNavCategories(),
  ])

  return (
    <StorefrontShell whatsapp={company.whatsapp} company={company} dict={dict} locale={locale} adminSlot={<StaffAdminLink />} navCategories={navCats}>
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
          categories={categories.map((c) => ({
            slug: c.slug,
            name: pick(locale, c.nameEn, c.nameId ?? c.nameEn),
          }))}
          initialCategory={category ?? ''}
          locale={locale}
          dict={dict}
        />
      </div>
    </StorefrontShell>
  )
}