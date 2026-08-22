import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  invoices, invoiceTemplates, bookings, bookingItems, bookingDeviceAllocations,
  customers, devices, lateFees, damageCharges,
} from '@/lib/db/schema'
import { logActivity } from './audit'

/**
 * Invoice services (spec §35). An invoice is generated from the booking's
 * stored pricing snapshots (§58) — never recomputed from today's prices —
 * plus any un-invoiced late fees / damage charges. The invoice row records
 * number, total and status; the printable document merges the (immutable)
 * booking snapshot with the template at render time.
 */

export async function listInvoices() {
  return db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(200)
}

export type InvoiceDetail = NonNullable<Awaited<ReturnType<typeof getInvoiceDetail>>>

export async function getInvoiceDetail(invoiceId: string) {
  const invoice = (await db.select().from(invoices).where(eq(invoices.id, invoiceId)))[0]
  if (!invoice) return null

  const booking = invoice.bookingId
    ? (await db.select().from(bookings).where(eq(bookings.id, invoice.bookingId)))[0] ?? null
    : null

  const customer = booking
    ? (await db.select().from(customers).where(eq(customers.id, booking.customerId)))[0] ?? null
    : null

  const items = booking ? await db.select().from(bookingItems).where(eq(bookingItems.bookingId, booking.id)) : []
  const allocations = booking
    ? await db.select().from(bookingDeviceAllocations).where(and(eq(bookingDeviceAllocations.bookingId, booking.id), isNull(bookingDeviceAllocations.releasedAt)))
    : []
  const devicesList = allocations.length
    ? await db.select().from(devices).where(inArray(devices.id, allocations.map((a) => a.deviceId)))
    : []

  const fees = booking
    ? {
        late: await db.select().from(lateFees).where(and(eq(lateFees.bookingId, booking.id), eq(lateFees.waived, false))),
        damage: await db.select().from(damageCharges).where(and(eq(damageCharges.bookingId, booking.id), eq(damageCharges.status, 'pending'))),
      }
    : { late: [], damage: [] }

  return { invoice, booking, customer, items, devices: devicesList, lateFees: fees.late, damageCharges: fees.damage }
}

/** Next sequential number INV-YYYYMMDD-NNN for today. */
async function nextInvoiceNumber(): Promise<string> {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const todays = await db.select({ number: invoices.number }).from(invoices)
  const max = todays
    .map((r) => r.number.match(/^INV-(\d{8})-(\d+)$/))
    .filter((m): m is RegExpMatchArray => !!m && m[1] === day)
    .reduce((acc, m) => Math.max(acc, Number(m[2])), 0)
  return `INV-${day}-${String(max + 1).padStart(3, '0')}`
}

/**
 * Generate an invoice for a booking. Idempotent per booking: re-generating
 * returns the existing unpaid/pending invoice instead of duplicating.
 */
export async function generateInvoiceForBooking(
  bookingId: string,
  opts: { byUserId?: string | null; dueAt?: Date | null } = {},
): Promise<{ id: string; number: string; alreadyExisted: boolean }> {
  const booking = (await db.select().from(bookings).where(eq(bookings.id, bookingId)))[0]
  if (!booking) throw new Error('Booking not found.')

  // Idempotency: one open invoice per booking.
  const existing = (
    await db.select().from(invoices)
      .where(and(eq(invoices.bookingId, bookingId), inArray(invoices.status, ['unpaid', 'pending', 'partially_paid'])))
      .limit(1)
  )[0]
  if (existing) {
    return { id: existing.id, number: existing.number, alreadyExisted: true }
  }

  // Total = booking snapshot total + un-waived late fees + pending damage charges.
  const late = await db.select().from(lateFees).where(and(eq(lateFees.bookingId, bookingId), eq(lateFees.waived, false)))
  const damage = await db.select().from(damageCharges).where(and(eq(damageCharges.bookingId, bookingId), eq(damageCharges.status, 'pending')))
  const extrasCents =
    late.reduce((s, f) => s + f.amountCents, 0) +
    damage.reduce((s, c) => s + c.amountCents, 0)

  const activeTemplate = (await db.select().from(invoiceTemplates).limit(1))[0]

  const id = crypto.randomUUID()
  const number = await nextInvoiceNumber()
  await db.insert(invoices).values({
    id,
    number,
    bookingId,
    customerId: booking.customerId,
    templateId: activeTemplate?.id ?? null,
    totalCents: booking.totalCents + extrasCents,
    status: 'unpaid',
    dueAt: opts.dueAt ?? null,
    createdById: opts.byUserId ?? null,
  })

  await logActivity({
    userId: opts.byUserId,
    action: 'invoice_generated',
    entity: 'invoice',
    entityId: id,
    metadata: { bookingNumber: booking.number, number, totalCents: booking.totalCents + extrasCents },
  })
  return { id, number, alreadyExisted: false }
}

export async function setInvoiceStatus(
  invoiceId: string,
  status: 'unpaid' | 'paid' | 'void',
  byUserId?: string | null,
) {
  const updated = await db.update(invoices).set({ status }).where(eq(invoices.id, invoiceId)).returning({ id: invoices.id, number: invoices.number, bookingId: invoices.bookingId })
  if (!updated.length) throw new Error('Invoice not found.')
  await logActivity({
    userId: byUserId,
    action: `invoice_marked_${status}`,
    entity: 'invoice',
    entityId: invoiceId,
    metadata: { number: updated[0].number },
  })
}
