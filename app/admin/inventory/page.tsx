import { db } from '@/lib/db'
import {
  deviceTrackingConfigurations, deviceTrackingEvents, productCategories, productAddOns,
} from '@/lib/db/schema'
import { isTrackingConfigured } from '@/lib/services/tracking'
import { listAddOns } from '@/lib/services/addons'
import { listCategoriesAdmin } from '@/lib/services/inventory'
import type { Metadata } from 'next'
import InventoryManager from '@/components/admin/inventory'
import type { AdminProductView, AdminPricingRule } from '@/components/admin/inventory'
import { getAdminDevices } from '@/lib/data/admin'
import { listProducts, listPricingRules } from '@/lib/services/inventory'

/** Per-device tracking view model passed down to the devices table (§41). */
export type TrackingView = {
  deviceId: string
  provider: string
  externalDeviceId: string | null
  enabled: boolean
  lastRecordedAt: Date | null
}

export const metadata: Metadata = {
  title: 'Go-Sewa Admin — Inventory',
  description: 'Manage Go-Sewa products, physical devices and pricing rules.',
}

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  const [productRows, ruleRows, devices, trackingProviderConnected, categoryRows, addOnRows] = await Promise.all([
    listProducts(),
    listPricingRules(),
    getAdminDevices(),
    isTrackingConfigured(),
    listCategoriesAdmin(),
    listAddOns(),
  ])

  const categories = categoryRows.map((c) => ({ id: c.id, slug: c.slug, nameId: c.nameId, nameEn: c.nameEn }))

  const configs = await db.select().from(deviceTrackingConfigurations)
  const productCategoryRows = await db.select({ productId: productCategories.productId, categoryId: productCategories.categoryId }).from(productCategories)
  const productAddOnRows = await db.select({ productId: productAddOns.productId, addOnId: productAddOns.addOnId }).from(productAddOns)
  const events = await db.select().from(deviceTrackingEvents)
  const lastEventByDevice = new Map<string, Date>()
  for (const e of events) {
    const prev = lastEventByDevice.get(e.deviceId)
    if (!prev || e.recordedAt > prev) lastEventByDevice.set(e.deviceId, e.recordedAt)
  }
  const tracking: TrackingView[] = configs.map((c) => ({
    deviceId: c.deviceId,
    provider: c.provider,
    externalDeviceId: c.externalDeviceId,
    enabled: c.enabled,
    lastRecordedAt: lastEventByDevice.get(c.deviceId) ?? null,
  }))

  const products: AdminProductView[] = productRows.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    categoryId: p.categoryId,
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

  const addOns = addOnRows.filter((a) => a.active).map((a) => ({ id: a.id, nameId: a.nameId, nameEn: a.nameEn, centsPerDay: a.centsPerDay, centsPerRental: a.centsPerRental }))

  return (
    <div className="min-h-screen bg-[#f4f1ea] px-4 py-8 text-[#173b3b] sm:px-6 xl:px-10">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">
          <a href="/admin" className="hover:underline">Admin</a> / Inventory
        </p>
        <InventoryManager products={products} rules={rules} devices={devices} trackingProviderConnected={trackingProviderConnected} tracking={tracking} categories={categories} productCategoryRows={productCategoryRows} addOns={addOns} productAddOnRows={productAddOnRows} />
      </div>
    </div>
  )
}
