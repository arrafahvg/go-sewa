import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  rentalAgreements, agreementTemplates, bookings, bookingItems,
  bookingDeviceAllocations, customers, devices, agreementLineItems,
} from '@/lib/db/schema'
import { logActivity, uid } from './audit'
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
  const booking = agreement.bookingId
    ? (await db.select().from(bookings).where(eq(bookings.id, agreement.bookingId)))[0] ?? null
    : null
  const customer = booking
    ? (await db.select().from(customers).where(eq(customers.id, booking.customerId)))[0] ?? null
    // Manual (booking-less) agreements store their own customerId.
    : agreement.customerId
      ? (await db.select().from(customers).where(eq(customers.id, agreement.customerId)))[0] ?? null
      : null
  const items = booking ? await db.select().from(bookingItems).where(eq(bookingItems.bookingId, booking.id)) : []
  const allocations = booking
    ? await db.select().from(bookingDeviceAllocations).where(and(eq(bookingDeviceAllocations.bookingId, booking.id)))
    : []
  const deviceRows = allocations.length
    ? await db.select().from(devices).where(inArray(devices.id, allocations.map((a) => a.deviceId)))
    : []
  const manualItems = agreement.bookingId
    ? []
    : await db.select().from(agreementLineItems)
        .where(eq(agreementLineItems.agreementId, agreement.id))
        .orderBy(asc(agreementLineItems.createdAt))
  return { agreement, booking, customer, items, devices: deviceRows, manualItems }
}

/** Newest-first list of agreements with linked booking/customer labels (spec §35). */
export async function listAgreements() {
  const rows = await db.select().from(rentalAgreements).orderBy(desc(rentalAgreements.createdAt)).limit(200)
  const bookingIds = [...new Set(rows.map((r) => r.bookingId).filter((x): x is string => !!x))]
  const custIds = [...new Set(rows.map((r) => r.customerId).filter((x): x is string => !!x))]
  const [bookRows, custRows] = await Promise.all([
    bookingIds.length
      ? db.select({ id: bookings.id, number: bookings.number, customerId: bookings.customerId }).from(bookings).where(inArray(bookings.id, bookingIds))
      : [],
    custIds.length
      ? db.select({ id: customers.id, name: customers.name }).from(customers).where(inArray(customers.id, custIds))
      : [],
  ])
  const bookingMap = new Map(bookRows.map((b) => [b.id, b]))
  const custMap = new Map(custRows.map((c) => [c.id, c.name]))
  return rows.map((r) => {
    const b = r.bookingId ? bookingMap.get(r.bookingId) : null
    return {
      ...r,
      bookingNumber: b?.number ?? null,
      customerName: b ? (custMap.get(b.customerId) ?? null) : (r.customerId ? (custMap.get(r.customerId) ?? null) : null),
    }
  })
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

/** Build the items table for a manual (booking-less) agreement — equipment description + qty. */
function renderManualItemsTable(lines: { description: string; quantity: number }[]): string {
  const rows = lines.map((l) =>
    `<tr><td>${l.description.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</td><td style="text-align:center">${l.quantity}</td></tr>`,
  ).join('')
  return `<table border="1" cellpadding="6" cellspacing="0" width="100%"><thead><tr><th>Item</th><th>Qty</th></tr></thead><tbody>${rows}</tbody></table>`
}

/**
 * Create a manual (booking-less) rental agreement (spec §21/§35). Unlike a
 * booking agreement it has no linked rental: staff enter a customer and a list
 * of equipment/terms. The active template (or the built-in default) is merged
 * with this manual context and stored; the draft can then be printed/signed and
 * shared exactly like a booking agreement. Audit-logged (§63).
 */
export async function createManualAgreement(input: {
  customerId?: string | null
  customerName: string
  customerPhone?: string | null
  customerEmail?: string | null
  lines: { description: string; quantity: number }[]
  byUserId?: string | null
}): Promise<{ id: string; number: string }> {
  const cleaned = input.lines
    .filter((l) => l.description?.trim() && l.quantity > 0)
    .map((l) => ({ description: l.description.trim(), quantity: Math.max(1, Math.floor(l.quantity)) }))
  if (cleaned.length === 0) throw new Error('Add at least one equipment/terms line.')

  // Resolve or create the customer (same reuse rule as bookings, §19B).
  let customerId = input.customerId ?? null
  if (!customerId) {
    const phone = input.customerPhone?.trim() ?? ''
    if (phone) {
      const found = (await db.select({ id: customers.id }).from(customers)
        .where(eq(customers.phone, phone)).limit(1))[0]
      customerId = found?.id ?? null
    }
  }
  if (!customerId) {
    const name = input.customerName?.trim()
    if (!name) throw new Error('Customer name is required.')
    customerId = uid()
    await db.insert(customers).values({
      id: customerId, name,
      phone: input.customerPhone?.trim() || null,
      email: input.customerEmail?.trim() || null,
    })
  }

  const templateRow = (await db.select().from(agreementTemplates).where(eq(agreementTemplates.active, true)).limit(1))[0]
  const templateVersion = templateRow?.version ?? 1

  const data: Record<string, string> = {
    agreement_number: '',
    booking_number: 'Manual — no linked rental',
    issued_at: new Date().toLocaleDateString(),
    customer_name: input.customerName?.trim() || '—',
    customer_phone: input.customerPhone?.trim() || '—',
    customer_email_line: input.customerEmail?.trim() ? ` - ${input.customerEmail.trim()}` : '',
    rental_dates: '—',
    items_table: renderManualItemsTable(cleaned),
    device_list: '—',
    rental_total: '—',
    deposit: '—',
  }
  const number = await nextAgreementNumber()
  data.agreement_number = number
  const contentHtml = mergeTemplate(templateRow?.bodyHtml ?? defaultTemplate(), data)

  const id = crypto.randomUUID()
  await db.insert(rentalAgreements).values({
    id, number,
    bookingId: null,
    customerId,
    templateId: templateRow?.id ?? null,
    templateVersion,
    contentHtml,
    status: 'draft',
    generatedById: input.byUserId ?? null,
  })
  await db.insert(agreementLineItems).values(cleaned.map((l) => ({
    id: crypto.randomUUID(), agreementId: id,
    description: l.description, quantity: l.quantity,
    unitPriceCents: 0, lineTotalCents: 0,
  })))

  await logActivity({
    userId: input.byUserId,
    action: 'agreement_created_manual',
    entity: 'agreement',
    entityId: id,
    metadata: { number, customerId, lineCount: cleaned.length },
  })
  return { id, number }
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
