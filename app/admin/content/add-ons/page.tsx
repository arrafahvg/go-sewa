import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import AddOnManager from '@/components/admin/addon-manager'
import { getCurrentUser } from '@/lib/services/auth'
import { listAddOns, getAddOnAvailability } from '@/lib/services/addons'
import { listProducts } from '@/lib/services/inventory'
import { db } from '@/lib/db'
import { productAddOns } from '@/lib/db/schema'

export const metadata: Metadata = {
  title: 'Go-Sewa Admin — Add-ons',
  description: 'Manage optional rental add-ons offered alongside products.',
}

export const dynamic = 'force-dynamic'

export default async function AddOnsPage() {
  const current = await getCurrentUser()
  if (!current) redirect('/sign-in')

  const [addOns, attachRows, productRows] = await Promise.all([
    listAddOns(),
    db.select({ addOnId: productAddOns.addOnId, productId: productAddOns.productId }).from(productAddOns),
    listProducts(),
  ])
  const counts = new Map<string, number>()
  for (const r of attachRows) counts.set(r.addOnId, (counts.get(r.addOnId) ?? 0) + 1)

  // Live availability snapshot: tracked stock minus demand over the next 24h.
  const now = new Date()
  const in24h = new Date(now.getTime() + 86_400_000)
  const liveAvailability = new Map<string, number | null>()
  for (const a of addOns) {
    const availability = await getAddOnAvailability(a.id, now, in24h)
    liveAvailability.set(a.id, availability.available)
  }

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#173b3b]">
      <div className="px-4 py-8 sm:px-6 xl:px-10">
        <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">
          <Link href="/admin" className="hover:underline">Admin</Link> /{' '}
          <Link href="/admin/content" className="hover:underline">Content</Link> / Add-ons
        </p>
        <h1 className="mt-2 font-serif text-3xl tracking-tight">Optional add-ons</h1>
        <p className="mt-1 max-w-xl text-sm text-[#173b3b]/60">
          Optional extras (insurance, accessories, services) that customers can tick
          on a product page. Priced per day or as a one-off per rental, bilingual
          for the ID/EN storefront. Attach them to products from Inventory.
        </p>
        <div className="mt-6">
          <AddOnManager
            addOns={addOns.map((a) => ({
              id: a.id,
              nameId: a.nameId,
              nameEn: a.nameEn,
              centsPerDay: a.centsPerDay,
              centsPerRental: a.centsPerRental,
              stockQty: a.stockQty,
              liveAvailable: liveAvailability.get(a.id) ?? null,
              active: a.active,
              productCount: counts.get(a.id) ?? 0,
            }))}
            products={productRows.map((p) => ({ id: p.id, name: p.name }))}
            attachRows={attachRows}
          />
        </div>
      </div>
    </div>
  )
}
