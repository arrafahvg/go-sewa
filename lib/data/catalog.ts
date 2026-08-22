import { and, eq, asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categories, products, rentalPricingRules, rentalAddOns } from '@/lib/db/schema'
import { getSettings } from '@/lib/services/settings'

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
  depositCents: number
  dailyCents: number
}

export type CatalogCategory = {
  slug: string
  nameId: string
  nameEn: string
}

/** Effective daily price from the lowest-priority "daily" rule (fallback to 0). */
async function dailyPriceFor(productId: string): Promise<number> {
  const rules = await db.select().from(rentalPricingRules).where(
    and(eq(rentalPricingRules.productId, productId), eq(rentalPricingRules.active, true)),
  ).orderBy(asc(rentalPricingRules.priority))
  const daily = rules.find((r) => r.kind === 'daily')
  return daily?.centsPerDay ?? 0
}

export async function getCategories(): Promise<CatalogCategory[]> {
  return (await db.select().from(categories).where(eq(categories.active, true))
    .orderBy(asc(categories.sortOrder))).map((c) => ({
      slug: c.slug, nameId: c.nameId, nameEn: c.nameEn,
    }))
}

export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  const rows = await db.select().from(products).where(eq(products.active, true))
  const catMap = new Map((await getCategories()).map((c) => [c.slug, c]))
  const result: CatalogProduct[] = []
  for (const p of rows) {
    const cat = p.categoryId
      ? (await db.select().from(categories).where(eq(categories.id, p.categoryId)))[0]
      : null
    const c = cat ? catMap.get(cat.slug) : null
    result.push({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description ?? '',
      imageUrl: p.imageUrl ?? '',
      categoryId: p.categoryId,
      categorySlug: cat?.slug ?? null,
      categoryNameId: c?.nameId ?? null,
      categoryNameEn: c?.nameEn ?? null,
      depositCents: p.depositCents,
      dailyCents: await dailyPriceFor(p.id),
    })
  }
  return result
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