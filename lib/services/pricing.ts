import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { rentalPricingRules, rentalAddOns, products } from '@/lib/db/schema'
import { rentalDays } from '@/lib/utils/dates'

export type PricingRuleKind = 'daily' | 'weekly' | 'monthly' | 'weekend' | 'seasonal' | 'promo' | 'custom'

export type PriceBreakdown = {
  productId: string
  productName: string
  days: number
  ruleKind: PricingRuleKind | null
  ruleLabel: string | null
  unitPriceCents: number        // effective daily/package unit for the line
  rentalCents: number           // product rental fee for the period
  addOnCents: number            // add-ons attached to this product line
  lineTotalCents: number        // rental + add-ons
}

/**
 * Compute the price of renting a product for a date range using the configured
 * pricing rules (spec §13/§14). The result is a snapshot: it captures WHICH rule
 * and price applied, so the booking service can store it for historical accuracy.
 */
export async function computeRentalPrice(
  productId: string,
  startsAt: Date,
  endsAt: Date,
  addOnIds: string[] = [],
): Promise<PriceBreakdown> {
  const days = rentalDays(startsAt, endsAt)
  const product = (await db.select().from(products).where(eq(products.id, productId)))[0]

  const activeRules = await db.select().from(rentalPricingRules).where(
    and(eq(rentalPricingRules.productId, productId), eq(rentalPricingRules.active, true)),
  )

  // Rank rules that are applicable to this window (daily always applies).
  const applicable = activeRules.filter((r) => {
    if (r.kind === 'daily') return true
    // Package rules apply only if the whole range fits their intended length.
    if (r.startsOn || r.endsOn) {
      const inRange =
        (!r.startsOn || r.startsOn.getTime() <= startsAt.getTime()) &&
        (!r.endsOn || r.endsOn.getTime() >= endsAt.getTime())
      if (!inRange) return false
    }
    return true
  }).sort((a, b) => a.priority - b.priority)

  if (applicable.length === 0) {
    return {
      productId, productName: product?.name ?? productId, days, ruleKind: 'daily',
      ruleLabel: 'Daily', unitPriceCents: 0, rentalCents: 0, addOnCents: 0, lineTotalCents: 0,
    }
  }

  let ruleCentsPerDay = 0
  let selectedKind: PricingRuleKind = 'daily'
  let selectedLabel = 'Daily'

  const priced = applicable.map((r) => {
    if (r.kind === 'weekly' || r.kind === 'monthly') {
      const packageDays = r.kind === 'weekly' ? 7 : 30
      // If rental fits exactly in a package, use package price; else package + extra days.
      const value = days <= packageDays
        ? r.packageCents
        : r.packageCents + r.centsPerDay * (days - packageDays)
      return { rule: r, value }
    }
    // daily / weekend / seasonal / promo / custom: per-day pricing.
    return { rule: r, value: r.centsPerDay * days }
  })

  const best = priced.sort((a, b) => a.value - b.value)[0]
  ruleCentsPerDay = best.rule.centsPerDay
  selectedKind = best.rule.kind as PricingRuleKind
  selectedLabel = best.rule.label
  const rentalCents = best.value

  const addOns = addOnIds.length
    ? await db.select().from(rentalAddOns).where(inArray(rentalAddOns.id, addOnIds))
    : []
  const addOnCents = addOns.reduce(
    (sum, a) => sum + a.centsPerDay * days + a.centsPerRental,
    0,
  )

  return {
    productId,
    productName: product?.name ?? productId,
    days,
    ruleKind: selectedKind,
    ruleLabel: selectedLabel,
    unitPriceCents: ruleCentsPerDay,
    rentalCents,
    addOnCents,
    lineTotalCents: rentalCents + addOnCents,
  }
}

/**
 * Build the full booking total: optional delivery fee, optional deposit, discount.
 * Deposits are tracked separately and NOT part of the rental fee; the "total due
 * before rental" is rental + delivery (+ add-ons) + deposit (spec §13).
 */
export async function quoteBooking(
  productId: string,
  startsAt: Date,
  endsAt: Date,
  opts: { quantity?: number; addOnIds?: string[]; deliveryFeeCents?: number; discountCents?: number } = {},
) {
  const quantity = opts.quantity ?? 1
  const perUnit = await computeRentalPrice(productId, startsAt, endsAt, opts.addOnIds)
  const rentalSubtotal = perUnit.lineTotalCents * quantity
  const deliveryFee = opts.deliveryFeeCents ?? 0
  const discount = opts.discountCents ?? 0
  const product = (await db.select().from(products).where(eq(products.id, productId)))[0]
  const deposit = (product?.depositCents ?? 0) * quantity
  const total = Math.max(0, rentalSubtotal + deliveryFee - discount)
  return {
    ...perUnit,
    quantity,
    rentalSubtotalCents: rentalSubtotal,
    deliveryFeeCents: deliveryFee,
    discountCents: discount,
    depositCents: deposit,
    totalCents: total,
    totalDueCents: total + deposit,
  }
}