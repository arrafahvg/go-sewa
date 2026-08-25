import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import CategoryManager from '@/components/admin/category-manager'
import { getCurrentUser } from '@/lib/services/auth'
import { listCategoriesAdmin, listProducts } from '@/lib/services/inventory'

export const metadata: Metadata = {
  title: 'Go-Sewa Admin — Categories',
  description: 'Manage product categories and storefront navbar links.',
}

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const current = await getCurrentUser()
  if (!current) redirect('/sign-in')

  const categories = await listCategoriesAdmin()
  const products = await listProducts()

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#173b3b]">
      <div className="px-4 py-8 sm:px-6 xl:px-10">
        <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">
          <Link href="/admin" className="hover:underline">Admin</Link> /{' '}
          <Link href="/admin/content" className="hover:underline">Content</Link> / Categories
        </p>
        <h1 className="mt-2 font-serif text-3xl tracking-tight">Categories</h1>
        <p className="mt-1 max-w-xl text-sm text-[#173b3b]/60">
          Categories group products on the storefront and can appear as links in the
          navbar. Flag “Show in navbar” to add a category link; with none flagged the
          navbar simply shows Home and Rent.
        </p>
        <div className="mt-6">
          <CategoryManager
            categories={categories.map((c) => ({
              id: c.id,
              slug: c.slug,
              nameId: c.nameId,
              nameEn: c.nameEn,
              showInNav: c.showInNav,
              sortOrder: c.sortOrder,
              active: c.active,
            }))}
            products={products.map((p) => ({ id: p.id, name: p.name }))}
          />
        </div>
      </div>
    </div>
  )
}
