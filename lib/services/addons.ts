import { and, asc, eq, gt, inArray, lt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { bookings, bookingAddOns, products, rentalAddOns, productAddOns } from '@/lib/db/schema'
import { BLOCKING_BOOKING_STATUSES } from './availability'
import { uid, logActivity } from './audit'

/**
 * Rental add-on administration services (spec §2C, §73, §63). Add-ons are
 * optional extras (accessories, insurance, delivery boosters) priced per day
 * or per rental and attachable to products. All writes are audit-logged;
 * server actions in app/actions/addons.ts guard these behind RBAC (§54).
 */

export type AddOnInput = {
  nameId: string
  nameEn: string
  centsPerDay?: number
  centsPerRental?: number
  /** Physical stock held; null = untracked/unlimited (insurance, services). */
  stockQty?: number | null
  active?: boolean
}

export async function listAddOns() {
  return db.select().from(rentalAddOns).orderBy(asc(rentalAddOns.nameEn))
}

/** Add-on ids attached to a given product (for the product form pre-fill). */
export async function listAddOnIdsForProduct(productId: string): Promise<string[]> {
  const rows = await db
    .select({ addOnId: productAddOns.addOnId })
    .from(productAddOns)
    .where(eq(productAddOns.productId, productId))
  return rows.map((r) => r.addOnId)
}

function validateNames(input: { nameId?: string; nameEn?: string }) {
  if (input.nameId !== undefined && !input.nameId.trim()) throw new Error('Indonesian name is required.')
  if (input.nameEn !== undefined && !input.nameEn.trim()) throw new Error('English name is required.')
}

export async function createAddOn(input: AddOnInput, byUserId: string) {
  validateNames(input)
  const nameId = input.nameId.trim()
  const nameEn = input.nameEn.trim()
  if (!Number.isInteger(input.centsPerDay ?? 0) || (input.centsPerDay ?? 0) < 0) throw new Error('Per-day price must be a non-negative amount.')
  if (!Number.isInteger(input.centsPerRental ?? 0) || (input.centsPerRental ?? 0) < 0) throw new Error('Per-rental price must be a non-negative amount.')
  const id = uid()
  await db.insert(rentalAddOns).values({
    id,
    nameId,
    nameEn,
    centsPerDay: input.centsPerDay ?? 0,
    centsPerRental: input.centsPerRental ?? 0,
    stockQty: input.stockQty ?? null,
    active: input.active ?? true,
  })
  await logActivity({
    userId: byUserId,
    action: 'addon_created',
    entity: 'rental_add_ons',
    entityId: id,
    metadata: { nameId, nameEn, centsPerDay: input.centsPerDay ?? 0, centsPerRental: input.centsPerRental ?? 0, stockQty: input.stockQty ?? null },
  })
  return { id }
}

export async function updateAddOn(
  id: string,
  patch: Partial<AddOnInput>,
  byUserId: string,
): Promise<void> {
  validateNames(patch)
  if ((patch.centsPerDay ?? 0) < 0 || (patch.centsPerRental ?? 0) < 0) {
    throw new Error('Prices must be non-negative amounts.')
  }
  await db.update(rentalAddOns).set({
    ...(patch.nameId !== undefined ? { nameId: patch.nameId.trim() } : {}),
    ...(patch.nameEn !== undefined ? { nameEn: patch.nameEn.trim() } : {}),
    ...(patch.centsPerDay !== undefined ? { centsPerDay: patch.centsPerDay } : {}),
    ...(patch.centsPerRental !== undefined ? { centsPerRental: patch.centsPerRental } : {}),
    ...(patch.stockQty !== undefined ? { stockQty: patch.stockQty } : {}),
    ...(patch.active !== undefined ? { active: patch.active } : {}),
  }).where(eq(rentalAddOns.id, id))
  await logActivity({
    userId: byUserId,
    action: 'addon_updated',
    entity: 'rental_add_ons',
    entityId: id,
    metadata: { ...patch },
  })
}

/**
 * Delete an add-on — refused while any product still attaches it, so historical
 * booking snapshots keep pointing at a real row (§58, §81).
 */
export async function deleteAddOn(id: string, byUserId: string): Promise<void> {
  const refs = await db
    .select({ productId: productAddOns.productId })
    .from(productAddOns)
    .where(eq(productAddOns.addOnId, id))
  if (refs.length > 0) {
    const names = await db
      .select({ name: products.name })
      .from(products)
      .where(inArray(products.id, refs.map((r) => r.productId)))
    throw new Error(`Cannot delete: still attached to ${names.map((n) => n.name).join(', ')}. Detach it from those products first.`)
  }
  const rows = await db.select().from(rentalAddOns).where(eq(rentalAddOns.id, id)).limit(1)
  await db.delete(rentalAddOns).where(eq(rentalAddOns.id, id))
  await logActivity({
    userId: byUserId,
    action: 'addon_deleted',
    entity: 'rental_add_ons',
    entityId: id,
    metadata: { nameEn: rows[0]?.nameEn ?? id },
  })
}

/** Product ids currently attached to an add-on (add-on-side editor pre-fill). */
export async function listProductIdsForAddOn(addOnId: string): Promise<string[]> {
  const rows = await db
    .select({ productId: productAddOns.productId })
    .from(productAddOns)
    .where(eq(productAddOns.addOnId, addOnId))
  return rows.map((r) => r.productId)
}

/**
 * Sync which products attach a given add-on — diffed, so other add-ons on those
 * products are untouched (unlike the replace-all product-side sync).
 */
export async function setAddOnProducts(addOnId: string, productIds: string[], byUserId: string): Promise<void> {
  const ids = [...new Set(productIds.filter(Boolean))]
  if (ids.length) {
    const known = await db.select({ id: products.id }).from(products).where(inArray(products.id, ids))
    if (known.length !== ids.length) throw new Error('One or more selected products no longer exist.')
  }
  const current = await db
    .select({ productId: productAddOns.productId })
    .from(productAddOns)
    .where(eq(productAddOns.addOnId, addOnId))
  const currentIds = new Set(current.map((r) => r.productId))
  const toAdd = ids.filter((id) => !currentIds.has(id))
  const toRemove = [...currentIds].filter((id) => !ids.includes(id))

  if (toAdd.length) {
    await db.insert(productAddOns).values(toAdd.map((productId) => ({ productId, addOnId }))).onConflictDoNothing()
  }
  for (const productId of toRemove) {
    await db.delete(productAddOns).where(and(eq(productAddOns.productId, productId), eq(productAddOns.addOnId, addOnId)))
  }
  await logActivity({
    userId: byUserId,
    action: 'addon_products_set',
    entity: 'rental_add_ons',
    entityId: addOnId,
    metadata: { attached: ids.length, added: toAdd.length, removed: toRemove.length },
  })
}

/**
 * Live add-on availability for a date range (§2C): tracked stock minus demand
 * from blocking-status bookings overlapping the window. NULL stock = unlimited.
 * Freed automatically once a booking's window passes — no manual restocking.
 */
export async function getAddOnAvailability(
  addOnId: string,
  startsAt: Date,
  endsAt: Date,
  excludeBookingId?: string,
): Promise<{ stock: number | null; booked: number; available: number | null }> {
  const rows = await db.select().from(rentalAddOns).where(eq(rentalAddOns.id, addOnId)).limit(1)
  const addOn = rows[0]
  if (!addOn) return { stock: 0, booked: 0, available: 0 }
  if (addOn.stockQty == null) return { stock: 0, booked: 0, available: null }

  const overlapping = await db.select({ id: bookings.id }).from(bookings).where(
    and(lt(bookings.startsAt, endsAt), gt(bookings.endsAt, startsAt)),
  )
  const bookingIds = overlapping.map((b) => b.id)
  let booked = 0
  if (bookingIds.length > 0) {
    const demand = await db
      .select({ qty: bookingAddOns.quantity, bookingId: bookingAddOns.bookingId })
      .from(bookingAddOns)
      .where(and(eq(bookingAddOns.addOnId, addOnId), inArray(bookingAddOns.bookingId, bookingIds)))
    for (const d of demand) {
      if (excludeBookingId && d.bookingId === excludeBookingId) continue
      booked += d.qty
    }
  }
  return { stock: addOn.stockQty, booked, available: Math.max(0, addOn.stockQty - booked) }
}

/**
 * Validate that every tracked add-on in `addOnIds` has enough live stock for
 * `quantity` units over the window. Throws with the §70 customer-safe message
 * on shortage — never silently overbooks.
 */
export async function assertAddOnStock(
  addOnIds: string[],
  startsAt: Date,
  endsAt: Date,
  quantity: number,
  excludeBookingId?: string,
): Promise<void> {
  if (addOnIds.length === 0) return
  const rows = await db.select().from(rentalAddOns).where(inArray(rentalAddOns.id, addOnIds))
  for (const addOn of rows) {
    if (addOn.stockQty == null) continue
    const availability = await getAddOnAvailability(addOn.id, startsAt, endsAt, excludeBookingId)
    const need = quantity
    if ((availability.available ?? 0) < need) {
      const left = availability.available ?? 0
      throw new Error(
        left <= 0
          ? `${addOn.nameEn} is no longer available for your selected dates. Please remove it or choose different dates.`
          : `Only ${left} left for your selected dates — ${addOn.nameEn}.`,
      )
    }
  }
}

/** Replace the set of add-ons attached to a product (replace-all semantics). */
export async function setProductAddOns(productId: string, addOnIds: string[], byUserId: string): Promise<void> {
  const ids = [...new Set(addOnIds.filter(Boolean))]
  if (ids.length) {
    const known = await db.select({ id: rentalAddOns.id }).from(rentalAddOns).where(inArray(rentalAddOns.id, ids))
    if (known.length !== ids.length) throw new Error('One or more selected add-ons no longer exist.')
  }
  await db.delete(productAddOns).where(eq(productAddOns.productId, productId))
  if (ids.length) {
    await db.insert(productAddOns).values(ids.map((addOnId) => ({ productId, addOnId }))).onConflictDoNothing()
  }
  await logActivity({
    userId: byUserId,
    action: 'product_addons_set',
    entity: 'products',
    entityId: productId,
    metadata: { count: ids.length, addOnIds: ids },
  })
}
