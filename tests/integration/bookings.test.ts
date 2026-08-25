import { describe, expect, it } from 'vitest'

/**
 * Integration test for the availability engine + booking conflict prevention
 * (§6). Exercises the REAL services (checkAvailability / createBooking) against
 * a disposable Postgres database — the same path public checkout uses (§19B).
 *
 * Runs ONLY when TEST_DATABASE_URL is set (schema applied via `npm run db:push`);
 * skipped otherwise so `npm test` stays green without a database.
 */
describe('availability engine + conflict prevention (integration, §6)', () => {
  it.skipIf(!process.env.TEST_DATABASE_URL)('reserves real devices, blocks overlaps and frees after the return date', async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
    const { createBooking } = await import('@/lib/services/bookings')
    const { checkAvailability } = await import('@/lib/services/availability')
    const { pool } = await import('@/lib/db')

    const suffix = Date.now()
    const customerId = `test-cust-${suffix}`
    const productId = `test-prod-${suffix}`
    const deviceA = `test-dev-a-${suffix}`
    const deviceB = `test-dev-b-${suffix}`
    const day = 86_400_000
    // Future window so nothing else collides; ends are exclusive (§ dates).
    const start = new Date(Date.now() + 10 * day)
    const end = new Date(Date.now() + 12 * day)
    const laterStart = new Date(Date.now() + 13 * day)
    const laterEnd = new Date(Date.now() + 15 * day)

    const setup = await pool.connect()
    try {
      await setup.query('BEGIN')
      await setup.query(
        `INSERT INTO customers (id, name, phone) VALUES ($1, 'Conflict Test', $2)`,
        [customerId, `+628${suffix}`],
      )
      await setup.query(
        `INSERT INTO products (id, name, slug, description, category_id, deposit_required)
           VALUES ($1, 'Conflict Cam', $2, 'test', 'test-cat', false)`,
        [productId, `conflict-cam-${suffix}`],
      )
      await setup.query(
        `INSERT INTO rental_pricing_rules (id, product_id, kind, label, cents_per_day, active, priority)
           VALUES ($1, $2, 'daily', 'Daily', 100000, true, 0)`,
        [`test-rule-${suffix}`, productId],
      )
      await setup.query(
        `INSERT INTO devices (id, product_id, asset_code, status) VALUES ($1, $2, $3, 'available'), ($4, $2, $5, 'available')`,
        [deviceA, productId, `CC-A-${suffix}`, deviceB, `CC-B-${suffix}`],
      )
      await setup.query('COMMIT')
    } finally {
      setup.release()
    }

      // Baseline: two units free inside the window.
      const before = await checkAvailability(productId, start, end)
      expect(before.total).toBe(2)
      expect(before.available).toBe(2)
      expect(before.unavailable).toBe(false)

      // Book BOTH units through the real service (same path as checkout §19B).
      const first = await createBooking({
        customerId,
        customerName: 'Conflict Test',
        items: [{ productId, quantity: 2 }],
        startsAt: start,
        endsAt: end,
        channel: 'in_store',
      })
      expect(first.ok).toBe(true)
      if (!first.ok) return

      // Overlapping attempt for one more unit must be refused — even though the
      // client asked nicely (§6: server-side validation, never trusted).
      const overlap = await createBooking({
        customerId,
        customerName: 'Conflict Test',
        items: [{ productId, quantity: 1 }],
        startsAt: start,
        endsAt: end,
        channel: 'online',
      })
      expect(overlap.ok).toBe(false)
      if (!overlap.ok) expect(overlap.reason).toBe('no_availability')

      // Availability now reads zero inside the window…
      const during = await checkAvailability(productId, start, end)
      expect(during.available).toBe(0)
      expect(during.unavailable).toBe(true)

      // …but the units are free again right after the return date ([start,end)).
      const afterReturn = await checkAvailability(productId, laterStart, laterEnd)
      expect(afterReturn.available).toBe(2)

      const cleanup = await pool.connect()
      try {
        await cleanup.query('BEGIN')
        await cleanup.query(`DELETE FROM booking_device_allocations WHERE booking_id IN (SELECT id FROM bookings WHERE customer_id = $1)`, [customerId])
        await cleanup.query(`DELETE FROM booking_items WHERE booking_id IN (SELECT id FROM bookings WHERE customer_id = $1)`, [customerId])
        await cleanup.query(`DELETE FROM bookings WHERE customer_id = $1`, [customerId])
        await cleanup.query(`DELETE FROM devices WHERE product_id = $1`, [productId])
        await cleanup.query(`DELETE FROM rental_pricing_rules WHERE product_id = $1`, [productId])
        await cleanup.query(`DELETE FROM products WHERE id = $1`, [productId])
        await cleanup.query(`DELETE FROM customers WHERE id = $1`, [customerId])
        await cleanup.query('COMMIT')
      } catch {
        await cleanup.query('ROLLBACK').catch(() => {})
      } finally {
        cleanup.release()
        await pool.end().catch(() => {})
      }
  }, 30_000)
})
