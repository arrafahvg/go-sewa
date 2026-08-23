import { eq, desc, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { bookings, payments } from '@/lib/db/schema'
import { logActivity, uid } from './audit'

/**
 * Payment recording and status computation (§16).
 * All writes are audit-logged (§63) and business logic lives on the server (§59).
 */

export type PaymentMethod = 'cash' | 'transfer' | 'qris' | 'ewallet' | 'other'

export type PaymentInput = {
  bookingId: string
  method: PaymentMethod
  amountCents: number
  note?: string
  byUserId: string
}

/** Record a payment against a booking, then recompute the booking's payment status. */
export async function recordPayment(input: PaymentInput) {
  if (input.amountCents <= 0) throw new Error('Payment amount must be greater than zero.')

  // Validate booking exists
  const booking = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.id, input.bookingId)).limit(1)
  if (!booking.length) throw new Error('Booking not found.')

  const paymentId = uid()
  await db.insert(payments).values({
    id: paymentId,
    bookingId: input.bookingId,
    method: input.method,
    amountCents: input.amountCents,
    kind: 'rental',
    reference: input.note ?? null,
    status: 'paid',
    receivedAt: new Date(),
    createdById: input.byUserId,
  })

  // Payment state is derived from payment history vs. the booking total —
  // there is no stored payment_status column on bookings (§81).
  const totals = await db
    .select({ sum: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int` })
    .from(payments)
    .where(eq(payments.bookingId, input.bookingId))

  const rentRow = await db
    .select({ totalCents: bookings.totalCents })
    .from(bookings)
    .where(eq(bookings.id, input.bookingId))
    .limit(1)

  const paid = Number(totals[0]?.sum ?? 0)
  const rentTotal = Number(rentRow[0]?.totalCents ?? 0)

  const derived: 'unpaid' | 'partially_paid' | 'paid' =
    paid <= 0 ? 'unpaid' : rentTotal > 0 && paid < rentTotal ? 'partially_paid' : 'paid'

  await db.update(bookings).set({ updatedAt: new Date() }).where(eq(bookings.id, input.bookingId))

  await logActivity({
    userId: input.byUserId,
    action: 'payment_recorded',
    entity: 'payment',
    entityId: paymentId,
    metadata: { bookingId: input.bookingId, method: input.method, amountCents: input.amountCents, derivedStatus: derived },
  })

  return { paymentId, status: derived }
}

/** Payment history for a booking, newest first. */
export async function getPaymentHistory(bookingId: string) {
  return db.select().from(payments).where(eq(payments.bookingId, bookingId)).orderBy(desc(payments.createdAt))
}