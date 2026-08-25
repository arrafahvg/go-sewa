import type { MetadataRoute } from 'next'

/** Robots (Phase 12): crawl the storefront, never the console or private shares. */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.BETTER_AUTH_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api', '/d', '/account'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
