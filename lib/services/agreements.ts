import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  rentalAgreements, agreementTemplates, bookings, bookingItems,
  bookingDeviceAllocations, customers, devices,
} from '@/lib/db/schema'
import { logActivity } from './audit'
import { formatMoney } from '@/lib/utils/money'

/**
 * Rental agreement generator (spec §21). The active template's HTML is merged
 * with immutable booking-snapshot data (§58). If no template exists, a
 * built-in default layout is used so generation always works. Agreements are
 * versioned via the template version recorded at generation time.
 */

export async function getAgreement(id: string) {
  return (await db.select().from(rentalAgreements).where(eq(rentalAgreements.id, id)))[0] ?? null
}

export async function getAgreementWithDetail(id: string) {
  const agreement = await getAgreement(id)
  if (!agreement) return null
  const booking = (await db.select().from(bookings).where(eq(bookings.id, agreement.bookingId)))[0] ?? null
  const customer = booking
    ? (await db.select().from(customers).where(eq(customers.id, booking.customerId)))[0] ?? null
    : null
  const items = booking ? await db.select().from(bookingItems).where(eq(bookingItems.bookingId, booking.id)) : []
  const allocations = booking
    ? await db.select().from(bookingDeviceAllocations).where(and(eq(bookingDeviceAllocations.bookingId, booking.id)))
    : []
  const deviceRows = allocations.length
    ? await db.select().from(devices).where(inArray(devices.id, allocations.map((a) => a.deviceId)))
    : []
  return { agreement, booking, customer, items, devices: deviceRows }
}

async function nextAgreementNumber(): Promise<string> {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rows = await db.select({ number: rentalAgreements.number }).from(rentalAgreements)
  const max = rows
    .map((r) => r.number.match(/^AGR-(\d{8})-(\d+)$/))
    .filter((m): m is RegExpMatchArray => !!m && m[1] === day)
    .reduce((acc, m) => Math.max(acc, Number(m[2])), 0)
  return `AGR-${day}-${String(max + 1).padStart(3, '0')}`
}

function renderItemsTable(
  items: { productNameSnapshot: string | null; productId: string; addOnId: string | null; quantity: number; unitPriceCents: number; lineTotalCents: number; priceRuleLabel: string | null }[],
): string {
  const rows = items.map((i) =>
    `<tr><td>${i.productNameSnapshot ?? i.productId}${i.addOnId ? ' (add-on)' : ''}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">${formatMoney(i.unitPriceCents)}</td><td style="text-align:right">${formatMoney(i.lineTotalCents)}</td></tr>`,
  ).join('')
  return `<table border="1" cellpadding="6" cellspacing="0" width="100%"><thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>`
}

function mergeTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => data[key] ?? '')
}

function defaultTemplate(): string {
  return `
<h1 style="font-family:serif">Rental Agreement</h1>
<p>Agreement <strong>{{agreement_number}}</strong> · Rental <strong>{{booking_number}}</strong> · Issued {{issued_at}}</p>
<h3>Customer</h3>
<p>{{customer_name}} · {{customer_phone}}{{customer_email_line}}</p>
<h3>Rental period</h3>
<p>{{rental_dates}}</p>
<h3>Equipment &amp; charges</h3>
{{items_table}}
<p><strong>Units:</strong> {{device_list}}</p>
<p>Rental fee: <strong>{{rental_total}}</strong> · Refundable deposit: <strong>{{deposit}}</strong> (held separately, returned after inspection)</p>
<h3>Terms</h3>
<ol>
  <li>The customer is responsible for the equipment during the rental period, including loss, theft, and damage beyond normal wear.</li>
  <li>Late returns are charged per additional day at the applicable daily rate, deducted from the deposit.</li>
  <li>The equipment must be returned in the condition noted at check-out, with all included accessories.</li>
  <li>Submerging non-waterproof equipment, disassembly, and unauthorized repair are prohibited.</li>
  <li>The deposit covers late fees, damage, and loss; any remainder is refunded after inspection.</li>
</ol>
<p style="margin-top:32px">Customer signature: ______________________  Date: ____________</p>`
}

/**
 * Generate (or refresh the draft of) a rental agreement for a booking.
 * Only one draft exists per booking; generating again re-renders it from the
 * latest template version. Signed agreements are never modified.
 */
export async function generateAgreementForBooking(
  bookingId: string,
  opts: { byUserId?: string | null } = {},
): Promise<{ id: string; number: string; alreadyExisted: boolean }> {
  const booking = (await db.select().from(bookings).where(eq(bookings.id, bookingId)))[0]
  if (!booking) throw new Error('Booking not found.')

  const existingDraft = (
    await db.select().from(rentalAgreements)
      .where(and(eq(rentalAgreements.bookingId, bookingId), eq(rentalAgreements.status, 'draft')))
      .limit(1)
  )[0]

  const customer = (await db.select().from(customers).where(eq(customers.id, booking.customerId)))[0] ?? null
  const items = await db.select().from(bookingItems).where(eq(bookingItems.bookingId, bookingId))
  const allocations = await db.select().from(bookingDeviceAllocations).where(and(eq(bookingDeviceAllocations.bookingId, bookingId)))
  const deviceRows = allocations.length
    ? await db.select().from(devices).where(inArray(devices.id, allocations.map((a) => a.deviceId)))
    : []

  const templateRow = (await db.select().from(agreementTemplates).where(eq(agreementTemplates.active, true)).limit(1))[0]
  const templateVersion = templateRow?.version ?? 1

  const data: Record<string, string> = {
    agreement_number: existingDraft?.number ?? '',
    booking_number: booking.number,
    issued_at: new Date().toLocaleDateString(),
    customer_name: customer?.name ?? '—',
    customer_phone: customer?.phone ?? '—',
    customer_email_line: customer?.email ? ` - ${customer.email}` : '',
    rental_dates: `${booking.startsAt.toLocaleDateString()} to ${booking.endsAt.toLocaleDateString()} (return due ${booking.endsAt.toLocaleDateString()})`,
    items_table: renderItemsTable(items),
    device_list: deviceRows.map((d) => `${d.assetCode}${d.imei ? ` (IMEI ${d.imei})` : ''}`).join(', ') || 'to be assigned',
    rental_total: formatMoney(booking.totalCents),
    deposit: booking.depositCents > 0 ? formatMoney(booking.depositCents) : 'none',
  }

  const contentHtml = mergeTemplate(templateRow?.bodyHtml ?? defaultTemplate(), data)

  if (existingDraft) {
    await db.update(rentalAgreements).set({ contentHtml, templateId: templateRow?.id ?? null, templateVersion }).where(eq(rentalAgreements.id, existingDraft.id))
    await logActivity({ userId: opts.byUserId, action: 'agreement_regenerated', entity: 'agreement', entityId: existingDraft.id, metadata: { bookingNumber: booking.number, templateVersion } })
    return { id: existingDraft.id, number: existingDraft.number, alreadyExisted: true }
  }

  const id = crypto.randomUUID()
  const number = await nextAgreementNumber()
  await db.insert(rentalAgreements).values({
    id,
    number,
    bookingId,
    templateId: templateRow?.id ?? null,
    templateVersion,
    contentHtml,
    status: 'draft',
    generatedById: opts.byUserId ?? null,
  })
  await logActivity({ userId: opts.byUserId, action: 'agreement_generated', entity: 'agreement', entityId: id, metadata: { bookingNumber: booking.number, number, templateVersion } })
  return { id, number, alreadyExisted: false }
}

export async function setAgreementStatus(
  id: string,
  status: 'draft' | 'printed' | 'signed',
  byUserId?: string | null,
) {
  const updated = await db.update(rentalAgreements).set({ status }).where(eq(rentalAgreements.id, id)).returning({ id: rentalAgreements.id, number: rentalAgreements.number })
  if (!updated.length) throw new Error('Agreement not found.')
  await logActivity({ userId: byUserId, action: `agreement_marked_${status}`, entity: 'agreement', entityId: id, metadata: { number: updated[0].number } })
}
export async function listAgreementsForBooking(bookingId: string) {
  return db.select().from(rentalAgreements).where(eq(rentalAgreements.bookingId, bookingId)).orderBy(desc(rentalAgreements.createdAt))
}
