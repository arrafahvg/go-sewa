import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  bookings, bookingItems, bookingExtensions, rentalPricingRules, bookingAddOns,
} from '@/lib/db/schema'
import { checkAvailability } from './availability'
import { assertAddOnStock } from './addons'
import { uid, logActivity } from './audit'

/**
 * Rental extensions (spec §29). An extension moves a booking's `endsAt` later
 * after re-checking real availability for the extra window — a conflict must
 * never be silently approved. Approved extensions append to the booking's
 * financial total (priced with the product's active daily rule at extension
 * time) while all earlier line-item snapshots stay untouched (§58).
 */

const DAY_MS = 86_400_000

/** Statuses from which an extension makes sense (device still reserved/out). */
const EXTENDABLE_STATUSES = [
  'confirmed', 'payment_pending', 'partially_paid', 'paid', 'reserved',
  'ready_for_pickup', 'out_for_delivery', 'active_rental', 'return_due', 'overdue',
] as const

export type BookingExtensionView = {
  id: string
  previousEndsAt: Date
  newEndsAt: Date
  additionalCents: number
  reason: string | null
  createdAt: Date
}

export async function listExtensions(bookingId: string): Promise<BookingExtensionView[]> {
  return db.select({
    id: bookingExtensions.id,
    previousEndsAt: bookingExtensions.previousEndsAt,
    newEndsAt: bookingExtensions.newEndsAt,
    additionalCents: bookingExtensions.additionalCents,
    reason: bookingExtensions.reason,
    createdAt: bookingExtensions.createdAt,
  }).from(bookingExtensions)
    .where(eq(bookingExtensions.bookingId, bookingId))
    .orderBy(desc(bookingExtensions.createdAt))
}

/** Active daily rate (minor units) for a product — lowest priority wins, matching the catalog. */
async function dailyRateCents(productId: string): Promise<number> {
  const rows = await db.select().from(rentalPricingRules).where(
    and(eq(rentalPricingRules.productId, productId), eq(rentalPricingRules.kind, 'daily'), eq(rentalPricingRules.active, true)),
  ).orderBy(asc(rentalPricingRules.priority))
  if (rows.length === 0) throw new Error('This product has no active daily pricing rule, so its rental cannot be extended.')
  return rows[0].centsPerDay
}

/**
 * Extend a booking's rental period. Runs the §6 availability engine over the
 * NEW window [old endsAt → new endsAt] for every product on the booking
 * (excluding this booking's own allocations). On any shortage the whole
 * extension is refused with the §29 customer-safe message; nothing is mutated.
 */
export async function extendBooking(
  input: { bookingId: string; newEndsAt: Date; reason?: string },
  byUserId?: string | null,
): Promise<{ id: string; additionalCents: number }> {
  const rows = await db.select().from(bookings).where(eq(bookings.id, input.bookingId)).limit(1)
  const booking = rows[0]
  if (!booking) throw new Error('Booking not found.')

  if (!(EXTENDABLE_STATUSES as readonly string[]).includes(booking.status)) {
    throw new Error('This booking can no longer be extended (it is not in an active/reserved state).')
  }
  const newEndsAt = input.newEndsAt
  if (!(newEndsAt instanceof Date) || Number.isNaN(newEndsAt.getTime())) {
    throw new Error('A valid new end date is required.')
  }
  if (newEndsAt.getTime() <= booking.endsAt.getTime()) {
    throw new Error('The new end date must be after the current end date.')
  }

  const items = await db.select().from(bookingItems).where(eq(bookingItems.bookingId, booking.id))
  if (items.length === 0) throw new Error('This booking has no items to extend.')

  // Aggregate quantities per product (add-on rows have no physical footprint).
  const qtyByProduct = new Map<string, number>()
  for (const item of items) {
    if (item.addOnId) continue
    qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) ?? 0) + item.quantity)
  }

  // Availability first — refuse the whole extension if any product is short (§29).
  for (const [productId, qty] of qtyByProduct) {
    const result = await checkAvailability(productId, booking.endsAt, newEndsAt, booking.id)
    if (result.available < qty) {
      throw new Error('This device is already reserved for another booking after your current rental period. Please choose different dates or contact us for alternatives.')
    }
  }

  // Price the extension window with each product's current daily rule.
  const extraMs = newEndsAt.getTime() - booking.endsAt.getTime()
  const extraDays = Math.max(1, Math.ceil(extraMs / DAY_MS))
  let additionalCents = 0
  for (const [productId, qty] of qtyByProduct) {
    additionalCents += (await dailyRateCents(productId)) * extraDays * qty
  }

  // Add-on stock over the WIDENED window (§2C): tracked add-ons this booking
  // took must still be free for the extra days — refused on shortage (§29).
  const takenAddOns = await db
    .select({ addOnId: bookingAddOns.addOnId, qty: bookingAddOns.quantity })
    .from(bookingAddOns)
    .where(eq(bookingAddOns.bookingId, booking.id))
  const qtyByAddOn = new Map<string, number>()
  for (const t of takenAddOns) qtyByAddOn.set(t.addOnId, (qtyByAddOn.get(t.addOnId) ?? 0) + t.qty)
  for (const [addOnId, qty] of qtyByAddOn) {
    await assertAddOnStock([addOnId], booking.endsAt, newEndsAt, qty, booking.id)
  }

  const id = uid()
  await db.insert(bookingExtensions).values({
    id,
    bookingId: booking.id,
    previousEndsAt: booking.endsAt,
    newEndsAt,
    additionalCents,
    reason: input.reason?.trim() || null,
    createdById: byUserId ?? null,
  })
  await db.update(bookings).set({
    endsAt: newEndsAt,
    rentalSubtotalCents: booking.rentalSubtotalCents + additionalCents,
    totalCents: booking.totalCents + additionalCents,
    updatedAt: new Date(),
  }).where(eq(bookings.id, booking.id))

  await logActivity({
    userId: byUserId,
    action: 'booking_extended',
    entity: 'booking',
    entityId: booking.id,
    metadata: {
      number: booking.number,
      previousEndsAt: booking.endsAt.toISOString(),
      newEndsAt: newEndsAt.toISOString(),
      extraDays,
      additionalCents,
    },
  })
  return { id, additionalCents }
}
