import { pool } from '@/lib/db'
import { quoteBooking } from './pricing'
import { logActivity, uid } from './audit'

export type BookingChannel = 'online' | 'in_store' | 'phone' | 'whatsapp'

export type CreateBookingInput = {
  customerName: string
  customerPhone?: string | null
  customerEmail?: string | null
  customerIdNumber?: string | null
  productId: string
  startsAt: Date
  endsAt: Date
  quantity?: number
  preferredDeviceIds?: string[]   // exact physical devices to assign (walk-in flow)
  addOnIds?: string[]
  fulfillment?: 'pickup' | 'delivery'
  returnMethod?: string
  deliveryAddress?: string | null
  recipientName?: string | null
  recipientPhone?: string | null
  deliveryNotes?: string | null
  deliveryFeeCents?: number
  discountCents?: number
  discountReason?: string | null
  channel?: BookingChannel
  notes?: string | null
  agreementAccepted?: boolean
  createdById?: string | null
}

export type CreateBookingResult =
  | { ok: true; bookingId: string; number: string; status: string }
  | { ok: false; error: string; reason?: 'invalid_dates' | 'no_availability' | 'internal' }

const VALID_FULFILLMENT = ['pickup', 'delivery'] as const
const VALID_RETURN = ['return_to_location', 'pickup_collection', 'courier_return', 'custom'] as const

function todayNumber(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}${m}${day}`
}

/**
 * Create a booking through the exact same availability + conflict-prevention the
 * public checkout uses (spec §6, §19B). Runs in a single transaction that locks
 * the product's physical devices (SELECT ... FOR UPDATE) so two concurrent
 * attempts to grab the last free unit cannot both succeed (§6).
 */
export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const start = new Date(input.startsAt)
  const end = new Date(input.endsAt)
  if (end.getTime() <= start.getTime()) {
    return { ok: false, error: 'Rental end must be after the start date.', reason: 'invalid_dates' }
  }

  const quantity = input.quantity ?? 1
  if (quantity < 1) return { ok: false, error: 'Quantity must be at least 1.', reason: 'invalid_dates' }

  const quote = await quoteBooking(input.productId, start, end, {
    quantity,
    addOnIds: input.addOnIds ?? [],
    deliveryFeeCents: input.deliveryFeeCents ?? 0,
    discountCents: input.discountCents ?? 0,
  })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Lock every physical unit of this product so concurrent bookings serialize.
    const devicesResult = await client.query(
      `SELECT id, status FROM devices WHERE product_id = $1 AND active = true FOR UPDATE`,
      [input.productId],
    )
    const allDeviceIds: string[] = devicesResult.rows.map((r: { id: string }) => r.id)

    // Load overlapping active bookings (same conflict rule as the public engine).
    const overlap = await client.query(
      `SELECT b.id FROM bookings b
       WHERE b.starts_at < $1 AND b.ends_at > $2
         AND b.status IN ('draft','pending','awaiting_confirmation','confirmed','payment_pending',
                          'partially_paid','paid','reserved','ready_for_pickup','out_for_delivery',
                          'active_rental','return_due','overdue','returned','inspection')`,
      [end, start],
    )
    const overlapIds: string[] = overlap.rows.map((r: { id: string }) => r.id)

    const allocated: string[] = []
    if (overlapIds.length > 0) {
      const alloc = await client.query(
        `SELECT device_id FROM booking_device_allocations
         WHERE booking_id = ANY($1::text[]) AND released_at IS NULL`,
        [overlapIds],
      )
      allocated.push(...alloc.rows.map((r: { device_id: string }) => r.device_id))
    }

    // Manual availability blocks intersecting the range.
    const blocks = await client.query(
      `SELECT device_id FROM availability_blocks WHERE starts_on < $1 AND ends_on > $2`,
      [end, start],
    )
    const blockedIds = new Set<string>(blocks.rows.map((r: { device_id: string }) => r.device_id))

    const unavailableStatuses = new Set(['maintenance', 'damaged', 'lost', 'retired', 'blocked'])
    const taken = new Set(allocated)
    const freeDeviceIds = allDeviceIds
      .filter((id) => !taken.has(id))
      .filter((id) => !blockedIds.has(id))
      .filter((id) => !unavailableStatuses.has(
        devicesResult.rows.find((r: { id: string }) => r.id === id)?.status,
      ))
// Determine which physical devices to assign.
    const preferred = [...new Set((input.preferredDeviceIds ?? []).filter((d) => freeDeviceIds.includes(d)))]
    const chosen: string[] = []
    if (preferred.length >= quantity) {
      chosen.push(...preferred.slice(0, quantity))
    } else {
      chosen.push(...preferred)
      for (const id of freeDeviceIds) {
        if (chosen.length >= quantity) break
        if (!chosen.includes(id)) chosen.push(id)
      }
    }
    if (chosen.length < quantity) {
      await client.query('ROLLBACK')
      return { ok: false, error: 'Not enough devices available for the selected dates.', reason: 'no_availability' }
    }

    // Customer — reuse by phone/email or create inline.
    let customerId: string
    const custRes = await client.query(
      `SELECT id FROM customers WHERE lower(phone) = lower($1) OR lower(email) = lower($2) LIMIT 1`,
      [input.customerPhone ?? '', input.customerEmail ?? ''],
    )
    if (custRes.rows.length > 0) {
      customerId = custRes.rows[0].id
    } else {
      customerId = uid()
      await client.query(
        `INSERT INTO customers (id, name, phone, email, id_number, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5, now(), now())`,
        [customerId, input.customerName, input.customerPhone ?? null, input.customerEmail ?? null, input.customerIdNumber ?? null],
      )
    }

    // Booking number: GS-YYYYMMDD-NNN
    const dateNum = todayNumber()
    const count = await client.query(
      `SELECT COUNT(*)::int AS c FROM bookings WHERE number LIKE $1`,
      [`GS-${dateNum}-%`],
    )
    const seq = ((count.rows[0]?.c ?? 0) + 1).toString().padStart(3, '0')
    const number = `GS-${dateNum}-${seq}`
    const bookingId = uid()
    const channel = input.channel ?? 'online'
    const fulfillment = input.fulfillment ?? 'pickup'
    const returnMethod = input.returnMethod ?? 'return_to_location'

    await client.query(
      `INSERT INTO bookings (id, number, customer_id, channel, status, fulfillment, return_method,
        starts_at, ends_at, delivery_address, recipient_name, recipient_phone, delivery_notes,
        delivery_fee_cents, discount_cents, discount_reason, rental_subtotal_cents, total_cents,
        deposit_cents, notes, created_by_id, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21, now(), now())`,
      [bookingId, number, customerId, channel,
        channel === 'in_store' ? 'confirmed' : 'pending',
        fulfillment, returnMethod, start, end, input.deliveryAddress ?? null,
        input.recipientName ?? null, input.recipientPhone ?? null, input.deliveryNotes ?? null,
        quote.deliveryFeeCents, quote.discountCents, input.discountReason ?? null,
        quote.rentalSubtotalCents, quote.totalCents, quote.depositCents, input.notes ?? null,
        input.createdById ?? null],
    )

    // Pricing snapshot for each unit (spec §58).
    await client.query(
      `INSERT INTO booking_items (id, booking_id, product_id, quantity, unit_price_cents,
        price_rule_kind, price_rule_label, add_on_cents, line_total_cents, product_name_snapshot)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [uid(), bookingId, input.productId, quantity, quote.unitPriceCents,
        quote.ruleKind, quote.ruleLabel, quote.addOnCents, quote.lineTotalCents, quote.productName],
    )

    // Reserve the chosen physical devices (spec §22) — mark reserved + track allocation.
    for (const deviceId of chosen) {
      await client.query(
        `INSERT INTO booking_device_allocations (id, booking_id, device_id, assigned_by_id, assigned_at)
         VALUES ($1,$2,$3,$4, now())`,
        [uid(), bookingId, deviceId, input.createdById ?? null],
      )
      await client.query(
        `UPDATE devices SET status = 'reserved', current_booking_id = $1, updated_at = now() WHERE id = $2`,
        [bookingId, deviceId],
      )
    }

    if (input.agreementAccepted) {
      await client.query(
        `INSERT INTO agreement_acceptances (id, agreement_id, booking_id, version, accepted, method, accepted_at)
         VALUES ($1,$2,$3,$4,$5,'online', now())`,
        [uid(), '', bookingId, 1, true],
      )
    }

    await client.query(
      `INSERT INTO activity_logs (id, user_id, action, entity, entity_id, metadata, created_at)
       VALUES ($1,$2,$3,$4,$5,$6, now())`,
      [uid(), input.createdById ?? null, `booking_created_${channel}`, 'booking', bookingId,
        JSON.stringify({ number, starts_at: start.toISOString(), ends_at: end.toISOString(), total: quote.totalCents })],
    )

    await client.query('COMMIT')
    return { ok: true, bookingId, number, status: channel === 'in_store' ? 'confirmed' : 'pending' }
  } catch (e: unknown) {
    await client.query('ROLLBACK')
    await logActivity({
      userId: input.createdById ?? null, action: 'booking_create_failed', entity: 'product',
      entityId: input.productId, metadata: { error: e instanceof Error ? e.message : 'unknown' },
    })
    return {
      ok: false,
      error: 'Unable to complete your booking. Please try again.',
      reason: 'internal',
    }
  } finally {
    client.release()
  }
}