import { pool } from '@/lib/db'
import { quoteBooking } from './pricing'
import { assertAddOnStock } from './addons'
import { logActivity, uid } from './audit'

export type BookingChannel = 'online' | 'in_store' | 'phone' | 'whatsapp'

export type BookingItemInput = {
  productId: string
  quantity?: number
  preferredDeviceIds?: string[]   // exact physical devices (walk-in flow)
  addOnIds?: string[]
}

export type CreateBookingInput = {
  customerName: string
  /** Pre-resolved customer id (e.g. identity document upload already created one). */
  customerId?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  customerIdNumber?: string | null
  productId?: string               // single-item form; ignored when `items` is provided
  items?: BookingItemInput[]       // multi-line cart form (one booking, many products)
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
  /** Signed-in account placing an online booking — linked to the customer record (§54). */
  userId?: string | null
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

  const resolvedItems: { productId: string; quantity: number; preferredDeviceIds: string[]; addOnIds: string[] }[] = (input.items?.length
    ? input.items
    : [{ productId: input.productId ?? '', quantity: input.quantity ?? 1,
         preferredDeviceIds: input.preferredDeviceIds, addOnIds: input.addOnIds }]
  ).map((it) => ({
    productId: it.productId,
    quantity: it.quantity ?? 1,
    preferredDeviceIds: it.preferredDeviceIds ?? [],
    addOnIds: it.addOnIds ?? [],
  }))
  if (resolvedItems.some((it) => !it.productId)) {
    return { ok: false, error: 'Every cart line needs a product.', reason: 'invalid_dates' }
  }
  const totalQuantity = resolvedItems.reduce((s, it) => s + it.quantity, 0)
  if (totalQuantity < 1) return { ok: false, error: 'Quantity must be at least 1.', reason: 'invalid_dates' }

  // Per-item pricing snapshots; delivery fee / discount apply once at booking level.
  const itemQuotes = []
  for (const it of resolvedItems) {
    itemQuotes.push(await quoteBooking(it.productId, start, end, {
      quantity: it.quantity, addOnIds: it.addOnIds, deliveryFeeCents: 0, discountCents: 0,
    }))
  }

  // Add-on stock validation (§2C): tracked add-ons must have enough live stock
  // over the window — refused with the §70 customer-safe message, all channels.
  for (const it of resolvedItems) {
    if (it.addOnIds.length === 0) continue
    await assertAddOnStock(it.addOnIds, start, end, it.quantity)
  }
  const rentalSubtotalCents = itemQuotes.reduce((s, q) => s + q.rentalSubtotalCents, 0)
  const depositTotalCents = itemQuotes.reduce((s, q) => s + q.depositCents, 0)
  const quote = {
    deliveryFeeCents: input.deliveryFeeCents ?? 0,
    discountCents: input.discountCents ?? 0,
    rentalSubtotalCents,
    depositCents: depositTotalCents,
    totalCents: Math.max(0, rentalSubtotalCents + (input.deliveryFeeCents ?? 0) - (input.discountCents ?? 0)),
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Load overlapping active bookings + manual blocks ONCE for the range (§6).
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

    const blocks = await client.query(
      `SELECT device_id FROM availability_blocks WHERE starts_on < $1 AND ends_on > $2`,
      [end, start],
    )
    const blockedIds = new Set<string>(blocks.rows.map((r: { device_id: string }) => r.device_id))
    const unavailableStatuses = new Set(['maintenance', 'damaged', 'lost', 'retired', 'blocked'])

    // Devices chosen earlier in THIS booking must not be reused either.
    const globallyTaken = new Set<string>(allocated)

    // Pick concrete free units per item, locking each product's units (§6).
    const chosenPerItem: { item: BookingItemInput; chosen: string[] }[] = []
    for (const it of resolvedItems) {
      const devicesResult = await client.query(
        `SELECT id, status FROM devices WHERE product_id = $1 AND active = true FOR UPDATE`,
        [it.productId],
      )
      const allDeviceIds: string[] = devicesResult.rows.map((r: { id: string }) => r.id)
      const freeDeviceIds = allDeviceIds
        .filter((id) => !globallyTaken.has(id))
        .filter((id) => !blockedIds.has(id))
        .filter((id) => !unavailableStatuses.has(
          devicesResult.rows.find((r: { id: string }) => r.id === id)?.status,
        ))

      const preferred = [...new Set(it.preferredDeviceIds.filter((d) => freeDeviceIds.includes(d)))]
      const chosen: string[] = []
      if (preferred.length >= it.quantity) {
        chosen.push(...preferred.slice(0, it.quantity))
      } else {
        chosen.push(...preferred)
        for (const id of freeDeviceIds) {
          if (chosen.length >= it.quantity) break
          if (!chosen.includes(id)) chosen.push(id)
        }
      }
      if (chosen.length < it.quantity) {
        await client.query('ROLLBACK')
        return { ok: false, error: 'Not enough devices available for the selected dates.', reason: 'no_availability' }
      }
      chosenPerItem.push({ item: it, chosen })
      for (const id of chosen) globallyTaken.add(id)
    }

// Determine which physical devices to assign.
    const allChosenDevices = chosenPerItem.flatMap((c) => c.chosen)

    // Customer — reuse by phone/email or create inline. When the booking comes
    // from a signed-in account, link the customer record to it (§54, §81).
    let customerId: string
    if (input.customerId) {
      // Customer was already resolved (identity document upload step) — reuse it.
      const exists = await client.query(`SELECT id FROM customers WHERE id = $1 LIMIT 1`, [input.customerId])
      if (exists.rows.length === 0) {
        await client.query('ROLLBACK')
        return { ok: false, error: 'Customer record from the document upload could not be found.', reason: 'internal' }
      }
      customerId = input.customerId
    } else {
    const custRes = await client.query(
      `SELECT id FROM customers WHERE lower(phone) = lower($1) OR lower(email) = lower($2) LIMIT 1`,
      [input.customerPhone ?? '', input.customerEmail ?? ''],
    )
    if (custRes.rows.length > 0) {
      customerId = custRes.rows[0].id
      if (input.userId) {
        await client.query(
          `UPDATE customers SET user_id = $1, updated_at = now()
           WHERE id = $2 AND user_id IS NULL`,
          [input.userId, customerId],
        )
      }
    } else {
      customerId = uid()
      await client.query(
        `INSERT INTO customers (id, name, phone, email, id_number, user_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6, now(), now())`,
        [customerId, input.customerName, input.customerPhone ?? null, input.customerEmail ?? null,
          input.customerIdNumber ?? null, input.userId ?? null],
      )
    }
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

    // Pricing snapshot per item — historical accuracy (spec §58).
    for (let i = 0; i < chosenPerItem.length; i++) {
      const { item } = chosenPerItem[i]
      const q = itemQuotes[i]
      await client.query(
        `INSERT INTO booking_items (id, booking_id, product_id, quantity, unit_price_cents,
          price_rule_kind, price_rule_label, add_on_cents, line_total_cents, product_name_snapshot)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [uid(), bookingId, item.productId, item.quantity, q.unitPriceCents,
          q.ruleKind, q.ruleLabel, q.addOnCents, q.lineTotalCents, q.productName],
      )
      // Demand ledger for tracked add-ons (§2C live stock) — inside the txn.
      for (const addOnId of [...new Set((item.addOnIds ?? []).filter(Boolean))]) {
        await client.query(
          `INSERT INTO booking_add_ons (id, booking_id, add_on_id, quantity) VALUES ($1,$2,$3,$4)`,
          [uid(), bookingId, addOnId, item.quantity],
        )
      }
    }

    // Reserve every chosen physical device (spec §22) — reserved + allocation tracked.
    for (const deviceId of allChosenDevices) {
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

    // Staff alert for online orders (§15 Admin-Reviewed Pricing) — never silently missed.
    if (channel === 'online') {
      await client.query(
        `INSERT INTO notifications (id, user_id, kind, title, body, read, created_at)
         SELECT $1 || '-' || u.id, u.id, 'info', $2, $3, false, now()
         FROM "user" u WHERE u.role IN ('owner','admin','staff')`,
        [uid(), `New online order ${number}`,
          `Booking ${number} (${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}) is awaiting review. Adjust pricing/delivery fee if needed, then confirm.`],
      )
    }

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