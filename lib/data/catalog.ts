import { and, eq, asc, gt, lt, inArray, isNull } from 'drizzle-orm'
import { db, dbRequest } from '@/lib/db'
import { categories, products, rentalPricingRules, rentalAddOns, devices, bookings, bookingDeviceAllocations, productCategories } from '@/lib/db/schema'
import { getSettings } from '@/lib/services/settings'
import { BLOCKING_BOOKING_STATUSES, UNBOOKABLE_DEVICE_STATUSES } from '@/lib/services/availability'

export type CatalogProduct = {
  id: string
  slug: string
  name: string
  description: string
  imageUrl: string
  categoryId: string | null
  categorySlug: string | null
  categoryNameId: string | null
  categoryNameEn: string | null
  /** Every category slug the product belongs to: primary + additional (§5). */
  categorySlugs: string[]
  depositCents: number
  depositRequired: boolean
  dailyCents: number
  /** Structured key/value specs (share §44 search across brand/type/spec values). */
  specs: Record<string, string>
  /** Product gallery images (§11); first entry mirrors imageUrl when set. */
  gallery: string[]
  /** Current stock snapshot: active units and how many are free right now. */
  stock: { total: number; freeNow: number }
}

export type CatalogCategory = {
  slug: string
  nameId: string
  nameEn: string
}

export async function getCategories(): Promise<CatalogCategory[]> {
  return dbRequest(() =>
    db.select().from(categories).where(eq(categories.active, true))
      .orderBy(asc(categories.sortOrder)),
  ).then((rows) => rows.map((c) => ({
    slug: c.slug, nameId: c.nameId, nameEn: c.nameEn,
  })))
}

/**
 * Categories flagged for the storefront navbar (§43), staff-managed at
 * /admin/content/categories. Empty list → the navbar shows only Home/Rent.
 */
export async function getNavCategories(): Promise<CatalogCategory[]> {
  return dbRequest(() =>
    db.select().from(categories).where(
      and(eq(categories.active, true), eq(categories.showInNav, true)),
    ).orderBy(asc(categories.sortOrder)),
  ).then((rows) => rows.map((c) => ({
    slug: c.slug, nameId: c.nameId, nameEn: c.nameEn,
  })))
}

export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  return dbRequest(() =>
    Promise.all([
      db.select().from(products).where(eq(products.active, true)),
      db.select().from(categories),
      db.select().from(rentalPricingRules)
        .where(eq(rentalPricingRules.active, true))
        .orderBy(asc(rentalPricingRules.priority)),
      db.select({ productId: productCategories.productId, slug: categories.slug })
        .from(productCategories)
        .innerJoin(categories, eq(categories.id, productCategories.categoryId)),
      // Stock snapshot inputs (batched — keeps the read pool-safe, §81).
      db.select({ id: devices.id, productId: devices.productId, status: devices.status }).from(devices).where(eq(devices.active, true)),
      db.select({ deviceId: bookingDeviceAllocations.deviceId })
        .from(bookingDeviceAllocations)
        .innerJoin(bookings, eq(bookings.id, bookingDeviceAllocations.bookingId))
        .where(and(
          isNull(bookingDeviceAllocations.releasedAt),
          gt(bookings.endsAt, new Date()),
          lt(bookings.startsAt, new Date()),
          inArray(bookings.status, BLOCKING_BOOKING_STATUSES),
        )),
    ]),
  ).then(([rows, allCats, dailyRules, extraCats, activeDevices, nowAllocs]) => {
    const catById = new Map(allCats.map((c) => [c.id, c]))
    const activeSlugs = new Set(allCats.filter((c) => c.active).map((c) => c.slug))
    // Lowest-priority active "daily" rule wins, matching the old per-product query.
    const dailyByProduct = new Map<string, number>()
    for (const r of dailyRules) {
      if (r.kind !== 'daily' || dailyByProduct.has(r.productId)) continue
      dailyByProduct.set(r.productId, r.centsPerDay)
    }
    // Stock snapshot: freeNow = an active unit that is not unbookable and not
    // held by a blocking booking overlapping right now. total === 0 covers
    // products registered without any physical unit yet.
    const nowHeld = new Set(nowAllocs.map((a) => a.deviceId))
    const unbookable = new Set(UNBOOKABLE_DEVICE_STATUSES as readonly string[])
    const stockByProduct = new Map<string, { total: number; freeNow: number }>()
    for (const d of activeDevices) {
      const s = stockByProduct.get(d.productId) ?? { total: 0, freeNow: 0 }
      s.total += 1
      if (!unbookable.has(d.status) && !nowHeld.has(d.id)) s.freeNow += 1
      stockByProduct.set(d.productId, s)
    }
    // Additional category slugs per product (primary is added per-product below).
    const extraByProduct = new Map<string, string[]>()
    for (const r of extraCats) {
      const list = extraByProduct.get(r.productId) ?? []
      list.push(r.slug)
      extraByProduct.set(r.productId, list)
    }
    return rows.map((p) => {
      const cat = p.categoryId ? (catById.get(p.categoryId) ?? null) : null
      const c = cat && activeSlugs.has(cat.slug) ? cat : null
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description ?? '',
        imageUrl: p.imageUrl ?? '',
        categoryId: p.categoryId,
        categorySlug: cat?.slug ?? null,
        categorySlugs: [...new Set([cat?.slug, ...(extraByProduct.get(p.id) ?? [])].filter((s): s is string => !!s))],
        categoryNameId: c?.nameId ?? null,
        categoryNameEn: c?.nameEn ?? null,
        depositCents: p.depositCents,
        depositRequired: p.depositRequired,
        dailyCents: dailyByProduct.get(p.id) ?? 0,
        specs: p.specs ?? {},
        gallery: [p.imageUrl, ...(p.gallery ?? [])].filter((u): u is string => !!u),
        stock: stockByProduct.get(p.id) ?? { total: 0, freeNow: 0 },
      }
    })
  })
}

export async function getProductBySlug(slug: string): Promise<CatalogProduct | null> {
  return (await getCatalogProducts()).find((p) => p.slug === slug) ?? null
}

export async function getCurrency(): Promise<string> {
  const s = await getSettings()
  return s.currency ?? 'IDR'
}

export async function getAddOns() {
  return db.select().from(rentalAddOns).where(eq(rentalAddOns.active, true))
}