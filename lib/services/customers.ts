import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { bookings, bookingItems, customers } from '@/lib/db/schema'

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