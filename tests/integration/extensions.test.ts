import { describe, expect, it } from 'vitest'

/**
 * Integration test for rental extensions (§29): availability is re-checked
 * over the extension window — a conflicting period must be REFUSED (never
 * silently approved), and an approved extension moves `endsAt` and appends
 * the extra daily cost to the booking total.
 *
 * Runs ONLY when TEST_DATABASE_URL is set; skipped otherwise so `npm test`
 * stays green without a database.
 */
describe('rental extensions (integration, §29)', () => {
  it.skipIf(!process.env.TEST_DATABASE_URL)('refuses conflicting windows and approves clean ones', async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
    const { createBooking } = await import('@/lib/services/bookings')
    const { extendBooking } = await import('@/lib/services/extensions')
    const { listExtensions } = await import('@/lib/services/extensions')
    const { pool } = await import('@/lib/db')

    const suffix = Date.now()
    const customerId = `test-cust-${suffix}`
    const productId = `test-prod-${suffix}`
    const deviceA = `test-dev-a-${suffix}`
    const day = 86_400_000
    // Booking [D+10 → D+12); competitor booking [D+12 → D+14) holds the ONLY other unit.
    const start = new Date(Date.now() + 10 * day)
    const end = new Date(Date.now() + 12 * day)
    const competitorEnd = new Date(Date.now() + 14 * day)
    const freeNewEnd = new Date(Date.now() + 13 * day)

    const setup = await pool.connect()
    try {
      await setup.query('BEGIN')
      await setup.query(
        `INSERT INTO customers (id, name, phone) VALUES ($1, 'Ext Test', $2)`,
        [customerId, `+628${suffix}`],
      )
      await setup.query(
        `INSERT INTO products (id, name, slug, description, category_id, deposit_required)
           VALUES ($1, 'Ext Cam', $2, 'test', 'test-cat', false)`,
        [productId, `ext-cam-${suffix}`],
      )
      await setup.query(
        `INSERT INTO rental_pricing_rules (id, product_id, kind, label, cents_per_day, active, priority)
           VALUES ($1, $2, 'daily', 'Daily', 100000, true, 0)`,
        [`test-rule-${suffix}`, productId],
      )
      await setup.query(
        `INSERT INTO devices (id, product_id, asset_code, status) VALUES ($1, $2, $3, 'available'), ($4, $2, $5, 'available')`,
        [deviceA, productId, `EX-A-${suffix}`, `test-dev-b-${suffix}`, `EX-B-${suffix}`],
      )
      await setup.query('COMMIT')
    } finally {
      setup.release()
    }

    // Booking A takes one unit [D+10 → D+12).
    const first = await createBooking({
      customerId,
      customerName: 'Ext Test',
      items: [{ productId, quantity: 1 }],
      startsAt: start,
      endsAt: end,
      channel: 'in_store',
    })
    expect(first.ok).toBe(true)
    if (!first.ok) return
    const bookingId = first.bookingId

    // Competitor booking takes the OTHER unit right after A returns [D+12 → D+14).
    const second = await createBooking({
      customerId,
      customerName: 'Ext Test',
      items: [{ productId, quantity: 1 }],
      startsAt: end,
      endsAt: competitorEnd,
      channel: 'in_store',
    })
    expect(second.ok).toBe(true)

    // Extending A to D+13 overlaps the competitor window and there are no spare
    // units → must be refused with the §29 message, nothing mutated.
    const beforeState = await pool.query('SELECT ends_at, total_cents FROM bookings WHERE id = $1', [bookingId])
    await expect(
      extendBooking({ bookingId, newEndsAt: new Date(Date.now() + 13 * day) }),
    ).rejects.toThrow('already reserved')
    const afterRefusal = await pool.query('SELECT ends_at, total_cents FROM bookings WHERE id = $1', [bookingId])
    expect(new Date(afterRefusal.rows[0].ends_at).getTime()).toBe(new Date(beforeState.rows[0].ends_at).getTime())
    expect(afterRefusal.rows[0].total_cents).toBe(beforeState.rows[0].total_cents)

    // Free the competitor's unit by releasing its allocation directly; a window
    // that stays clear of real conflicts now succeeds.
    await pool.query(
      `UPDATE booking_device_allocations SET released_at = now() WHERE booking_id = $1`,
      [second.ok ? second.bookingId : ''],
    )

    const result = await extendBooking({ bookingId, newEndsAt: freeNewEnd, reason: 'trip extended' })
    // 1 extra day × Rp 100.000/day × 1 unit.
    expect(result.additionalCents).toBe(100000)

    const after = await pool.query('SELECT ends_at, total_cents, rental_subtotal_cents FROM bookings WHERE id = $1', [bookingId])
    expect(new Date(after.rows[0].ends_at).getTime()).toBe(freeNewEnd.getTime())
    expect(after.rows[0].total_cents).toBe(beforeState.rows[0].total_cents + 100000)
    expect(after.rows[0].rental_subtotal_cents).toBeGreaterThan(0)

    const history = await listExtensions(bookingId)
    expect(history.length).toBe(1)
    expect(history[0].additionalCents).toBe(100000)
    expect(history[0].reason).toBe('trip extended')

    await pool.end()
  })
})
