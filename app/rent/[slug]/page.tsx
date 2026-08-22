import { notFound } from 'next/navigation'
import { getProductBySlug, getAddOns } from '@/lib/data/catalog'
import StorefrontShell from '@/components/storefront/storefront-shell'
import ProductDetail from '@/components/storefront/product-detail'
import { getWhatsappNumber } from '@/lib/services/settings'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  return {
    title: product ? `${product.name} — Go-Sewa` : 'Rent — Go-Sewa',
    description: product?.description || 'Rent premium tech from Go-Sewa.',
  }
}

export const dynamic = 'force-dynamic'

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [product, whatsapp] = await Promise.all([getProductBySlug(slug), getWhatsappNumber()])
  if (!product) notFound()

  const addOns = await getAddOns()

  return (
    <StorefrontShell whatsapp={whatsapp}>
      <ProductDetail product={product} addOns={addOns} whatsapp={whatsapp} />
    </StorefrontShell>
  )
}