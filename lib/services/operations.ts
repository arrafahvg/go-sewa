import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  bookings, customers, bookingItems, bookingDeviceAllocations,
  devices, deviceCheckouts, deviceCheckins, inspectionChecklists,
  products,
} from '@/lib/db/schema'
import { pool } from '@/lib/db'
import { logActivity, uid } from './audit'

/** Full booking detail for the admin booking screen. */
export async function getBookingDetail(bookingId: string) {
  const booking = (await db.select().from(bookings).where(eq(bookings.id, bookingId)))[0]
  if (!booking) return null
  const customer = (await db.select().from(customers).where(eq(customers.id, booking.customerId)))[0] ?? null
  const items = await db.select().from(bookingItems).where(eq(bookingItems.bookingId, bookingId))
  const allocations = await db.select().from(bookingDeviceAllocations).where(
    and(eq(bookingDeviceAllocations.bookingId, bookingId), isNull(bookingDeviceAllocations.releasedAt)),
  )
  const deviceRows = allocations.length
    ? await db.select().from(devices)
    : []
  const allocDevices = allocations.map((a) => ({
    allocation: a,
    device: deviceRows.find((d) => d.id === a.deviceId) ?? null,
  }))
  const checkouts = await db.select().from(deviceCheckouts).where(eq(deviceCheckouts.bookingId, bookingId))
  const checkins = await db.select().from(deviceCheckins).where(eq(deviceCheckins.bookingId, bookingId))
  return { booking, customer, items, allocDevices, checkouts, checkins }
}

/**
 * Check a reserved unit out to the customer (§23): device → rented,
 * booking → active_rental, condition report recorded.
 */
export async function checkOutDevice(input: {
  bookingId: string
  deviceId: string
  condition?: string
  conditionsMet?: boolean
  notes?: string | null
  byUserId?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const booking = (await db.select().from(bookings).where(eq(bookings.id, input.bookingId)))[0]
  if (!booking) return { ok: false, error: 'Booking not found.' }
  if (!['confirmed', 'reserved', 'ready_for_pickup', 'paid'].includes(booking.status)) {
    return { ok: false, error: `Booking in status "${booking.status}" cannot be checked out.` }
  }
  const device = (await db.select().from(devices).where(eq(devices.id, input.deviceId)))[0]
  if (!device) return { ok: false, error: 'Device not found.' }
  if (!['reserved', 'available'].includes(device.status)) {
    return { ok: false, error: `Device ${device.assetCode} is ${device.status}, not available for check-out.` }
  }

  // Deposit-required products force a verified ID document on file (§19, §2528).
  const depositItems = await db
    .select({ depositRequired: products.depositRequired })
    .from(bookingItems)
    .innerJoin(products, eq(bookingItems.productId, products.id))
    .where(eq(bookingItems.bookingId, input.bookingId))
  const needsIdDoc = depositItems.some((i) => i.depositRequired)
  if (needsIdDoc && booking.customerId) {
    const { hasValidIdDocument } = await import('./documents')
    if (!(await hasValidIdDocument(booking.customerId))) {
      return { ok: false, error: 'This rental requires a verified ID document (KTP/SIM) on file before check-out.' }
    }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `UPDATE devices SET status = 'rented', current_booking_id = $1, updated_at = now() WHERE id = $2`,
      [input.bookingId, input.deviceId],
    )
    await client.query(
      `UPDATE bookings SET status = 'active_rental', confirmed_at = COALESCE(confirmed_at, now()), updated_at = now() WHERE id = $1`,
      [input.bookingId],
    )
    await client.query(
      `INSERT INTO device_checkouts (id, booking_id, device_id, condition, conditions_met, notes, checked_out_by_id, checked_out_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now())`,
      [uid(), input.bookingId, input.deviceId, input.condition ?? 'excellent',
        input.conditionsMet ?? true, input.notes ?? null, input.byUserId ?? null],
    )
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    return { ok: false, error: e instanceof Error ? e.message : 'Check-out failed.' }
  } finally {
    client.release()
  }
  await logActivity({
    userId: input.byUserId ?? null, action: 'checkout_completed', entity: 'booking', entityId: input.bookingId,
    metadata: { deviceId: input.deviceId },
  })
  return { ok: true }
}

/**
 * Check a unit back in (§24): device → inspection (never straight to available),
 * booking → inspection, check-in record with condition + missing accessories.
 */
export async function checkInDevice(input: {
  bookingId: string
  deviceId: string
  condition?: string
  missingAccessories?: string[]
  damageNoted?: boolean
  notes?: string | null
  byUserId?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const booking = (await db.select().from(bookings).where(eq(bookings.id, input.bookingId)))[0]
  if (!booking) return { ok: false, error: 'Booking not found.' }
  if (!['active_rental', 'overdue', 'return_due', 'returning'].includes(booking.status)) {
    return { ok: false, error: `Booking in status "${booking.status}" cannot be checked in.` }
  }
  const device = (await db.select().from(devices).where(eq(devices.id, input.deviceId)))[0]
  if (!device) return { ok: false, error: 'Device not found.' }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `UPDATE devices SET status = 'inspection', current_booking_id = NULL, last_inspected_at = now(), updated_at = now() WHERE id = $1`,
      [input.deviceId],
    )
    await client.query(
      `UPDATE bookings SET status = 'inspection', updated_at = now() WHERE id = $1`,
      [input.bookingId],
    )
    await client.query(
      `UPDATE booking_device_allocations SET released_at = now()
       WHERE booking_id = $1 AND device_id = $2 AND released_at IS NULL`,
      [input.bookingId, input.deviceId],
    )
    await client.query(
      `INSERT INTO device_checkins (id, booking_id, device_id, condition, missing_accessories, damage_noted, notes, checked_in_by_id, checked_in_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())`,
      [uid(), input.bookingId, input.deviceId, input.condition ?? 'good',
        JSON.stringify(input.missingAccessories ?? []), input.damageNoted ?? false,
        input.notes ?? null, input.byUserId ?? null],
    )
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    return { ok: false, error: e instanceof Error ? e.message : 'Check-in failed.' }
  } finally {
    client.release()
  }
  await logActivity({
    userId: input.byUserId ?? null, action: 'checkin_completed', entity: 'booking', entityId: input.bookingId,
    metadata: { deviceId: input.deviceId, damageNoted: input.damageNoted ?? false },
  })
  return { ok: true }
}

/**
 * Post-return inspection (§24/§25): pass → available, fail → damaged.
 * Damaged units never re-enter the rentable pool automatically (§80).
 */
export async function recordInspection(input: {
  deviceId: string
  bookingId?: string | null
  passed: boolean
  items?: { label: string; ok: boolean; note?: string }[]
  byUserId?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const device = (await db.select().from(devices).where(eq(devices.id, input.deviceId)))[0]
  if (!device) return { ok: false, error: 'Device not found.' }
  if (device.status !== 'inspection') {
    return { ok: false, error: `Device ${device.assetCode} is not awaiting inspection.` }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `UPDATE devices SET status = $1, updated_at = now() WHERE id = $2`,
      [input.passed ? 'available' : 'damaged', input.deviceId],
    )
    await client.query(
      `INSERT INTO inspection_checklists (id, device_id, checkin_id, passed, items, inspected_by_id, inspected_at)
       VALUES ($1,$2,NULL,$3,$4,$5, now())`,
      [uid(), input.deviceId, input.passed, JSON.stringify(input.items ?? []), input.byUserId ?? null],
    )
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    return { ok: false, error: e instanceof Error ? e.message : 'Inspection failed.' }
  } finally {
    client.release()
  }
  await logActivity({
    userId: input.byUserId ?? null, action: input.passed ? 'inspection_passed' : 'inspection_failed',
    entity: 'device', entityId: input.deviceId, metadata: { bookingId: input.bookingId ?? null },
  })
  return { ok: true }
}

/**
 * Assign free physical units to a booking that reserved product-level availability (§22).
 * Validates each device is genuinely free before allocating.
 */
export async function assignDevices(input: {
  bookingId: string
  deviceIds: string[]
  byUserId?: string | null
}): Promise<{ ok: boolean; error?: string; assigned?: string[] }> {
  const booking = (await db.select().from(bookings).where(eq(bookings.id, input.bookingId)))[0]
  if (!booking) return { ok: false, error: 'Booking not found.' }

  const assigned: string[] = []
  for (const deviceId of input.deviceIds) {
    const device = (await db.select().from(devices).where(eq(devices.id, deviceId)))[0]
    if (!device) return { ok: false, error: 'Device not found.' }
    if (!['available', 'reserved'].includes(device.status)) {
      return { ok: false, error: `Device ${device.assetCode} is ${device.status} and cannot be assigned.` }
    }
    const existing = await db.select().from(bookingDeviceAllocations).where(
      and(eq(bookingDeviceAllocations.deviceId, deviceId), isNull(bookingDeviceAllocations.releasedAt)),
    )
    if (existing.length > 0) {
      return { ok: false, error: `Device ${device.assetCode} is already assigned to another rental.` }
    }
    assigned.push(deviceId)
  }

  for (const deviceId of assigned) {
    await db.insert(bookingDeviceAllocations).values({
      id: uid(), bookingId: input.bookingId, deviceId, assignedById: input.byUserId ?? null,
    })
    await db.update(devices).set({ status: 'reserved', currentBookingId: input.bookingId, updatedAt: new Date() })
      .where(eq(devices.id, deviceId))
  }
  await logActivity({
    userId: input.byUserId ?? null, action: 'devices_assigned', entity: 'booking', entityId: input.bookingId,
    metadata: { deviceIds: assigned },
  })
  return { ok: true, assigned }
}

const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  awaiting_confirmation: ['confirmed', 'cancelled'],
  confirmed: ['ready_for_pickup', 'cancelled', 'active_rental'],
  payment_pending: ['paid', 'cancelled'],
  partially_paid: ['paid', 'cancelled'],
  paid: ['ready_for_pickup', 'reserved'],
  reserved: ['ready_for_pickup', 'active_rental', 'cancelled'],
  ready_for_pickup: ['active_rental', 'cancelled'],
  out_for_delivery: ['active_rental', 'cancelled'],
  active_rental: ['return_due', 'overdue', 'returned', 'inspection'],
  return_due: ['overdue', 'returned', 'inspection'],
  overdue: ['returned', 'inspection'],
  returned: ['inspection', 'completed'],
  inspection: ['completed'],
}

/** Guarded booking status transition (§17) with audit logging (§63). */
export async function updateBookingStatus(input: {
  bookingId: string
  status: string
  byUserId?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const booking = (await db.select().from(bookings).where(eq(bookings.id, input.bookingId)))[0]
  if (!booking) return { ok: false, error: 'Booking not found.' }
  const allowed = ALLOWED_STATUS_TRANSITIONS[booking.status] ?? []
  if (!allowed.includes(input.status)) {
    return { ok: false, error: `Cannot move booking from "${booking.status}" to "${input.status}".` }
  }
  await db.update(bookings).set({ status: input.status as never, updatedAt: new Date() })
    .where(eq(bookings.id, input.bookingId))
  await logActivity({
    userId: input.byUserId ?? null, action: 'booking_status_changed', entity: 'booking', entityId: input.bookingId,
    metadata: { from: booking.status, to: input.status },
  })
  return { ok: true }
}

const PRICING_EDITABLE_STATUSES = ['pending', 'awaiting_confirmation']

/**
 * Admin-reviewed pricing (spec §15): while an online order awaits confirmation,
 * staff can adjust the delivery fee and per-line unit prices. Edits update the
 * booking's stored snapshot values — legitimate because the booking is not yet
 * historical; §58 protects completed records. Audit-logged (§63). Amounts freeze
 * after confirmation.
 */
export async function adjustBookingPricing(input: {
  bookingId: string
  deliveryFeeCents?: number
  lines: { itemId: string; unitPriceCents: number }[]
  byUserId?: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const booking = (await db.select().from(bookings).where(eq(bookings.id, input.bookingId)))[0]
  if (!booking) return { ok: false, error: 'Booking not found.' }
  if (!PRICING_EDITABLE_STATUSES.includes(booking.status)) {
    return { ok: false, error: `Pricing can only be adjusted while the order awaits confirmation (current status: "${booking.status}").` }
  }

  let rentalSubtotal = 0
  for (const line of input.lines) {
    const item = (await db.select().from(bookingItems).where(eq(bookingItems.id, line.itemId)).limit(1))[0]
    if (!item || item.bookingId !== input.bookingId) continue
    const unitPrice = Math.max(0, Math.round(line.unitPriceCents))
    const lineTotal = unitPrice * (item.quantity ?? 1) + (item.addOnCents ?? 0)
    await db.update(bookingItems)
      .set({ unitPriceCents: unitPrice, lineTotalCents: lineTotal })
      .where(eq(bookingItems.id, line.itemId))
    rentalSubtotal += lineTotal
  }

  const deliveryFee = Math.max(0, Math.round(input.deliveryFeeCents ?? booking.deliveryFeeCents ?? 0))
  const discount = booking.discountCents ?? 0
  const total = Math.max(0, rentalSubtotal + deliveryFee - discount)

  await db.update(bookings)
    .set({ deliveryFeeCents: deliveryFee, rentalSubtotalCents: rentalSubtotal, totalCents: total, updatedAt: new Date() })
    .where(eq(bookings.id, input.bookingId))

  await logActivity({
    userId: input.byUserId ?? null, action: 'booking_pricing_adjusted',
    entity: 'booking', entityId: input.bookingId,
    metadata: { deliveryFeeCents: deliveryFee, rentalSubtotalCents: rentalSubtotal, totalCents: total },
  })
  return { ok: true }
}