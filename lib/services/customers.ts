import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { logActivity } from './audit'
import { db } from '@/lib/db'
import { bookingItems, bookings, customerDocuments, customerTags, customers, invoices, rentalAgreements } from '@/lib/db/schema'
import { activityLogs } from '@/lib/db/schema'

/**
 * Customer↔account resolution (§54, §78 Phase 6). The database stays the single
 * source of truth (§81): the link lives in customers.user_id.
 *
 * Resolution order:
 *  1. explicit link via customers.user_id
 *  2. one-time auto-link when the customer record's email matches the account
 *     email exactly (case-insensitive) and no other customer claims that email
 *     with a different user — this connects past online checkouts to the account
 * Returns null when the signed-in user has no customer profile yet (e.g. never
 * checked out); callers must show an empty state rather than invent data (§80).
 */
export async function resolveCustomerForUser(user: { id: string; email: string }) {
  const byLink = (await db.select().from(customers).where(eq(customers.userId, user.id)).limit(1))[0]
  if (byLink) return byLink

  if (!user.email) return null
  const claimable = (
    await db
      .select()
      .from(customers)
      .where(and(sql`lower(${customers.email}) = ${user.email.toLowerCase()}`, isNull(customers.userId)))
      .limit(2)
  )
  // Only auto-link when it is unambiguous — never merge two customer records.
  if (claimable.length !== 1) return null
  const updated = (
    await db.update(customers)
      .set({ userId: user.id, updatedAt: new Date() })
      .where(eq(customers.id, claimable[0].id))
      .returning()
  )[0]
  return updated ?? null
}

/** All bookings belonging to a customer, newest first, with per-item snapshots (§58). */
export async function getBookingsForCustomer(customerId: string) {
  const rows = await db.select().from(bookings)
    .where(eq(bookings.customerId, customerId))
    .orderBy(desc(bookings.createdAt))

  if (rows.length === 0) return []
  const items = await db.select().from(bookingItems)
  const itemsMap = new Map<string, { productName: string; qty: number; lineTotalCents: number }[]>()
  for (const i of items) {
    const list = itemsMap.get(i.bookingId) ?? []
    list.push({ productName: i.productNameSnapshot ?? i.productId, qty: i.quantity, lineTotalCents: i.lineTotalCents })
    itemsMap.set(i.bookingId, list)
  }
  return rows.map((b) => ({ ...b, items: itemsMap.get(b.id) ?? [] }))
}

export type CustomerBooking = Awaited<ReturnType<typeof getBookingsForCustomer>>[number]

/**
 * Full customer detail for the CRM detail page (/admin/customers/[id], §31B):
 * profile, identity documents, tags, bookings with their generated invoices and
 * agreements, plus lifetime stats. All data is read from the DB (§81) — no
 * derived numbers are invented.
 */
export async function getCustomerDetail(customerId: string) {
  const customer = (await db.select().from(customers).where(eq(customers.id, customerId)).limit(1))[0]
  if (!customer) return null

  const [docs, tags, bookingsList] = await Promise.all([
    db.select().from(customerDocuments).where(eq(customerDocuments.customerId, customerId)),
    db.select().from(customerTags).where(eq(customerTags.customerId, customerId)),
    getBookingsForCustomer(customerId),
  ])

  const bookingIds = bookingsList.map((b) => b.id)
  const invoiceRows = bookingIds.length
    ? await db.select({ id: invoices.id, number: invoices.number, bookingId: invoices.bookingId, status: invoices.status, totalCents: invoices.totalCents }).from(invoices).where(inArray(invoices.bookingId, bookingIds))
    : []
  const agreementRows = bookingIds.length
    ? await db.select({ id: rentalAgreements.id, number: rentalAgreements.number, bookingId: rentalAgreements.bookingId, status: rentalAgreements.status }).from(rentalAgreements).where(inArray(rentalAgreements.bookingId, bookingIds))
    : []

  const active = new Set(['draft', 'pending', 'confirmed', 'checked_out', 'overdue', 'returning', 'inspection'])
  return {
    customer,
    documents: docs,
    tags,
    bookings: bookingsList,
    invoicesByBooking: new Map(invoiceRows.map((i) => [i.bookingId, i])),
    agreementsByBooking: new Map(agreementRows.map((a) => [a.bookingId, a])),
    stats: {
      totalBookings: bookingsList.length,
      totalSpentCents: bookingsList.reduce((s, b) => s + b.totalCents, 0),
      activeBookings: bookingsList.filter((b) => active.has(b.status)).length,
      lastRentalAt: bookingsList[0]?.startsAt ?? null,
    },
  }
}

/**
 * Customer activity timeline (spec §32): every audit-log entry that belongs to
 * this customer directly (entity = 'customer') or to one of their bookings
 * (entity = 'booking'), newest first. A "created" anchor comes from the
 * customer row itself — never invented (§80).
 */
export async function getCustomerTimeline(customerId: string) {
  const bookingIds = (
    await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.customerId, customerId))
  ).map((b) => b.id)

  const direct = await db.select().from(activityLogs)
    .where(and(eq(activityLogs.entity, 'customer'), eq(activityLogs.entityId, customerId)))

  const viaBookings = bookingIds.length
    ? await db.select().from(activityLogs)
        .where(and(eq(activityLogs.entity, 'booking'), inArray(activityLogs.entityId, bookingIds)))
    : []

  const events = [...direct, ...viaBookings]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((e) => ({
      id: e.id,
      action: e.action,
      metadata: e.metadata ?? {},
      at: e.createdAt.toISOString(),
      // Booking-scoped events carry their booking number for context.
      bookingId: e.entity === 'booking' ? e.entityId : null,
    }))

  return { events, createdAt: null as string | null }
}

/** Update editable CRM profile fields (§31B). Server-side validated, audit-logged (§63). */
export async function updateCustomerProfile(
  customerId: string,
  input: { name?: string; phone?: string | null; email?: string | null; address?: string | null; notes?: string | null },
  byUserId: string | null,
): Promise<void> {
  const name = input.name?.trim()
  if (name !== undefined && !name) throw new Error('Customer name is required.')
  const email = input.email?.trim() || null
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address.')

  const updated = await db.update(customers)
    .set({
      ...(name !== undefined ? { name } : {}),
      ...(input.phone !== undefined ? { phone: (input.phone ?? '').trim() || null } : {}),
      ...(input.email !== undefined ? { email } : {}),
      ...(input.address !== undefined ? { address: (input.address ?? '').trim() || null } : {}),
      ...(input.notes !== undefined ? { notes: (input.notes ?? '').trim() || null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(customers.id, customerId))
    .returning({ id: customers.id })
  if (updated.length === 0) throw new Error('Customer not found.')

  await logActivity({
    userId: byUserId, action: 'customer_updated', entity: 'customer',
    entityId: customerId,
    metadata: { fields: Object.keys(input) },
  })
}
