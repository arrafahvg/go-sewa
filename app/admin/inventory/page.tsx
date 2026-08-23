import type { Metadata } from 'next'
import InventoryManager from '@/components/admin/inventory'
import type { AdminProductView, AdminPricingRule } from '@/components/admin/inventory'
import { getAdminDevices } from '@/lib/data/admin'
import { listProducts, listPricingRules } from '@/lib/services/inventory'

export const metadata: Metadata = {
  title: 'Go-Sewa Admin — Inventory',
  description: 'Manage Go-Sewa products, physical devices and pricing rules.',
}

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  const [productRows, ruleRows, devices] = await Promise.all([
    listProducts(),
    listPricingRules(),
    getAdminDevices(),
  ])

  const products: AdminProductView[] = productRows.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    depositCents: p.depositCents,
    depositRequired: p.depositRequired,
    active: p.active,
    imageUrl: p.imageUrl,
    gallery: p.gallery ?? [],
  }))
  const rules: AdminPricingRule[] = ruleRows.map((r) => ({
    id: r.id,
    productId: r.productId,
    kind: r.kind,
    label: r.label,
    centsPerDay: r.centsPerDay,
    packageCents: r.packageCents,
    active: r.active,
    priority: r.priority,
  }))

  return (
    <div className="min-h-screen bg-[#f4f1ea] px-6 py-8 text-[#173b3b]">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">
          <a href="/admin" className="hover:underline">Admin</a> / Inventory
        </p>
        <InventoryManager products={products} rules={rules} devices={devices} />
      </div>
    </div>
  )
}
