import { describe, expect, it } from 'vitest'

/**
 * Integration test for live add-on stock (§2C): a tracked add-on can only be
 * booked as many times as units exist over the window — once consumed it is
 * refused with the §70 customer-safe message, then frees after the window.
 *
 * Runs ONLY when TEST_DATABASE_URL is set; skipped otherwise so `npm test`
 * stays green without a database.
 */
describe('add-on live stock (integration, §2C)', () => {
  it.skipIf(!process.env.TEST_DATABASE_URL)('refuses overbooking a tracked add-on and frees it after the window', async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
    const { createBooking } = await import('@/lib/services/bookings')
    const { getAddOnAvailability } = await import('@/lib/services/addons')
    const { pool } = await import('@/lib/db')

    const suffix = Date.now()
    const customerId = `test-cust-${suffix}`
    const productId = `test-prod-${suffix}`
    const deviceA = `test-dev-a-${suffix}`
    const addOnId = `test-addon-${suffix}`
    const day = 86_400_000
    const start = new Date(Date.now() + 20 * day)
    const end = new Date(Date.now() + 22 * day)

    const setup = await pool.connect()
    try {
      await setup.query('BEGIN')
      await setup.query(
        `INSERT INTO customers (id, name, phone) VALUES ($1, 'Stock Test', $2)`,
        [customerId, `+628${suffix}`],
      )
      await setup.query(
        `INSERT INTO products (id, name, slug, description, category_id, deposit_required)
           VALUES ($1, 'Stock Cam', $2, 'test', 'test-cat', false)`,
        [productId, `stock-cam-${suffix}`],
      )
      await setup.query(
        `INSERT INTO rental_pricing_rules (id, product_id, kind, label, cents_per_day, active, priority)
           VALUES ($1, $2, 'daily', 'Daily', 100000, true, 0)`,
        [`test-rule-${suffix}`, productId],
      )
      await setup.query(
        `INSERT INTO devices (id, product_id, asset_code, status) VALUES ($1, $2, $3, 'available'), ($4, $2, $5, 'available')`,
        [deviceA, productId, `ST-A-${suffix}`, `test-dev-b-${suffix}`, `ST-B-${suffix}`],
      )
      // Two powerbanks in stock.
      await setup.query(
        `INSERT INTO rental_add_ons (id, name_id, name_en, cents_per_day, cents_per_rental, stock_qty, active)
           VALUES ($1, 'Power bank', 'Power bank', 8000, 0, 2, true)`,
        [addOnId],
      )
      await setup.query('COMMIT')
    } finally {
      setup.release()
    }

    // Baseline: 2 available.
    const before = await getAddOnAvailability(addOnId, start, end)
    expect(before.available).toBe(2)

    // First booking takes 1 (product + add-on) for [D+20 → D+22).
    const one = await createBooking({
      customerId, customerName: 'Stock Test',
      items: [{ productId, quantity: 1, addOnIds: [addOnId] }],
      startsAt: start, endsAt: end, channel: 'in_store',
    })
    expect(one.ok).toBe(true)
    expect((await getAddOnAvailability(addOnId, start, end)).available).toBe(1)

    // Second booking takes the last 1 → ok, now 0 left.
    const two = await createBooking({
      customerId, customerName: 'Stock Test',
      items: [{ productId, quantity: 1, addOnIds: [addOnId] }],
      startsAt: start, endsAt: end, channel: 'in_store',
    })
    expect(two.ok).toBe(true)
    expect((await getAddOnAvailability(addOnId, start, end)).available).toBe(0)

    // Third tries to take 1 more → refused (no_availability), nothing booked.
    const three = await createBooking({
      customerId, customerName: 'Stock Test',
      items: [{ productId, quantity: 1, addOnIds: [addOnId] }],
      startsAt: start, endsAt: end, channel: 'online',
    })
    expect(three.ok).toBe(false)
    if (!three.ok) expect(three.error).toMatch(/no longer available/)

    // After the window passes, stock frees again.
    const later = await getAddOnAvailability(addOnId, new Date(Date.now() + 25 * day), new Date(Date.now() + 27 * day))
    expect(later.available).toBe(2)

    await pool.end()
  })
})