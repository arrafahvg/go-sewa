import { notFound } from 'next/navigation'
import { getProductBySlug, getAddOns, getNavCategories } from '@/lib/data/catalog'
import StorefrontShell from '@/components/storefront/storefront-shell'
import StaffAdminLink from '@/components/storefront/staff-admin-link'
import ProductDetail from '@/components/storefront/product-detail'
import { getCompanyInfo } from '@/lib/services/settings'
import { getDictionary, getLocale, pick } from '@/lib/i18n'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return { title: 'Rent — Go-Sewa' }
  const title = `${product.name} — Go-Sewa`
  const description = product.description || 'Rent premium tech from Go-Sewa.'
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [product, company, locale, dict, navCats] = await Promise.all([getProductBySlug(slug), getCompanyInfo(), getLocale(), getDictionary(), getNavCategories()])
  if (!product) notFound()

  const addOns = await getAddOns()
  const categoryLabel = pick(
    locale,
    product.categoryNameEn ?? '',
    product.categoryNameId ?? product.categoryNameEn ?? '',
  )

  return (
    <StorefrontShell whatsapp={company.whatsapp} company={company} dict={dict} locale={locale} adminSlot={<StaffAdminLink />} navCategories={navCats}>
      <ProductDetail product={product} addOns={addOns} whatsapp={company.whatsapp} categoryLabel={categoryLabel} dict={dict} />
    </StorefrontShell>
  )
}