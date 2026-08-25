import type { MetadataRoute } from 'next'
import { listProducts } from '@/lib/services/inventory'

/**
 * Storefront sitemap (Phase 12): static routes + every active product detail
 * page. Admin/API/document-share routes are intentionally excluded.
 */
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.BETTER_AUTH_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const staticRoutes = ['', '/rent', '/checkout', '/sign-in'].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.7,
  }))

  let productRoutes: MetadataRoute.Sitemap = []
  try {
    const products = await listProducts()
    productRoutes = products
      .filter((p) => p.active && !p.noindex)
      .map((p) => ({
        url: `${base}/rent/${p.slug}`,
        lastModified: p.updatedAt ?? new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.9,
      }))
  } catch {
    // Database unavailable (e.g. build time) — ship the static routes only.
  }

  return [...staticRoutes, ...productRoutes]
}
