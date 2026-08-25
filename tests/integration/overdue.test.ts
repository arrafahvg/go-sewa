import { describe, expect, it } from 'vitest'

/**
 * Integration test for the overdue automation service (§17).
 *
 * Runs ONLY when TEST_DATABASE_URL is set (e.g. a disposable Postgres database
 * with the schema applied via `npm run db:push`). Skipped otherwise so
 * `npm test` stays green in environments without a database.
 */
describe('markOverdueRentals (integration, §17)', () => {
  it.skipIf(!process.env.TEST_DATABASE_URL)('flips passed-due rentals + their units to overdue and notifies staff', async () => {
    // Point the app's pool at the test database BEFORE importing lib/db.
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
    const { markOverdueRentals } = await import('@/lib/services/overdue')
    const { pool } = await import('@/lib/db')

    const suffix = Date.now()
    const customerId = `test-cust-${suffix}`
    const productId = `test-prod-${suffix}`
    const deviceId = `test-dev-${suffix}`
    const bookingId = `test-book-${suffix}`

    try {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await client.query(
          `INSERT INTO customers (id, name, phone) VALUES ($1, 'Test Customer', $2)`,
          [customerId, `+628${suffix}`],
        )
        await client.query(
          `INSERT INTO products (id, name, slug, description, category_id)
           VALUES ($1, 'Test Camera', $2, 'test', 'test-cat')`,
          [productId, `test-camera-${suffix}`],
        )
        await client.query(
          `INSERT INTO devices (id, product_id, asset_code, status) VALUES ($1, $2, $3, 'rented')`,
          [deviceId, productId, `TEST-${suffix}`],
        )
        // A rental that ended an hour ago — must be flagged overdue.
        await client.query(
          `INSERT INTO bookings (id, number, customer_id, status, starts_at, ends_at,
             rental_subtotal_cents, deposit_cents, total_cents, channel, fulfillment, return_method)
           VALUES ($1, $2, $3, 'active_rental', now() - interval '3 days', now() - interval '1 hour',
             100000, 50000, 150000, 'online', 'pickup', 'return_to_location')`,
          [bookingId, `TST-${suffix}`, customerId],
        )
        await client.query(
          `INSERT INTO booking_device_allocations (id, booking_id, device_id)
           VALUES ($1, $2, $3)`,
          [`test-alloc-${suffix}`, bookingId, deviceId],
        )
        // A staff user to receive the notification.
        await client.query(
          `INSERT INTO "user" (id, name, email, role) VALUES ($1, 'Test Staff', $2, 'staff')`,
          [`test-staff-${suffix}`, `staff-${suffix}@test.local`],
        )
        await client.query('COMMIT')
      } finally {
        client.release()
      }

      // First sweep flips the rental; second is idempotent.
      const first = await markOverdueRentals()
      expect(first.updatedBookings).toBeGreaterThanOrEqual(1)

      const after = await pool.connect()
      let bookingStatus: string | null = null
      let deviceStatus: string | null = null
      let notificationCount = 0
      try {
        bookingStatus = (await after.query('SELECT status FROM bookings WHERE id = $1', [bookingId])).rows[0].status
        deviceStatus = (await after.query('SELECT status FROM devices WHERE id = $1', [deviceId])).rows[0].status
        notificationCount = (await after.query(
          `SELECT count(*)::int AS c FROM notifications WHERE user_id = $1 AND title LIKE '%overdue%'`,
          [`test-staff-${suffix}`],
        )).rows[0].c
      } finally {
        after.release()
      }
      expect(bookingStatus).toBe('overdue')
      expect(deviceStatus).toBe('overdue')
      expect(notificationCount).toBe(1)

      // Idempotency: a second run must not re-flag or re-notify this booking.
      await markOverdueRentals()
      const again = await pool.connect()
      let notificationCountAfterSecondRun = 0
      try {
        notificationCountAfterSecondRun = (await again.query(
          `SELECT count(*)::int AS c FROM notifications WHERE user_id = $1 AND title LIKE '%overdue%'`,
          [`test-staff-${suffix}`],
        )).rows[0].c
      } finally {
        again.release()
      }
      expect(notificationCountAfterSecondRun).toBe(1)
    } finally {
      const cleanup = await pool.connect()
      try {
        await cleanup.query('BEGIN')
        await cleanup.query(`DELETE FROM notifications WHERE user_id = $1`, [`test-staff-${suffix}`])
        await cleanup.query(`DELETE FROM "user" WHERE id = $1`, [`test-staff-${suffix}`])
        await cleanup.query(`UPDATE booking_device_allocations SET released_at = now() WHERE booking_id = $1`, [bookingId])
        await cleanup.query(`DELETE FROM booking_device_allocations WHERE booking_id = $1`, [bookingId])
        await cleanup.query(`DELETE FROM bookings WHERE id = $1`, [bookingId])
        await cleanup.query(`DELETE FROM devices WHERE id = $1`, [deviceId])
        await cleanup.query(`DELETE FROM products WHERE id = $1`, [productId])
        await cleanup.query(`DELETE FROM customers WHERE id = $1`, [customerId])
        await cleanup.query('COMMIT')
      } catch {
        await cleanup.query('ROLLBACK').catch(() => {})
      } finally {
        cleanup.release()
        await pool.end().catch(() => {})
      }
    }
  }, 30_000)
})
