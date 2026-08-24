import { pool } from '@/lib/db'
import { logActivity } from './audit'

/**
 * Overdue automation (§17): any active rental whose return window has passed
 * becomes `overdue`, and its physical units follow into device status `overdue`.
 * Idempotent — safe to run on a schedule or opportunistically.
 */
export async function markOverdueRentals(): Promise<{ updatedBookings: number }> {
  const client = await pool.connect()
  let updated = 0
  try {
    await client.query('BEGIN')

    const due = await client.query(
      `SELECT id FROM bookings
       WHERE status IN ('active_rental', 'return_due') AND ends_at < now()
       FOR UPDATE`,
    )
    const ids: string[] = due.rows.map((r: { id: string }) => r.id)

    if (ids.length > 0) {
      await client.query(
        `UPDATE bookings SET status = 'overdue', updated_at = now()
         WHERE id = ANY($1::text[])`,
        [ids],
      )
      // Units still out with the customer become overdue too (§4).
      await client.query(
        `UPDATE devices d SET status = 'overdue', updated_at = now()
         FROM booking_device_allocations a
         WHERE a.device_id = d.id AND a.booking_id = ANY($1::text[]) AND a.released_at IS NULL`,
        [ids],
      )
      // Notify all staff about each newly-overdue rental (same pattern as the
      // new-order notification in services/bookings.ts) — atomic with the flip.
      await client.query(
        `INSERT INTO notifications (id, user_id, kind, title, body, read, created_at)
         SELECT $1 || '-' || b.id || '-' || u.id, u.id, 'warning',
                'Rental overdue: ' || b.number,
                'Booking ' || b.number || ' passed its return window (' ||
                  to_char(b.ends_at, 'YYYY-MM-DD HH24:MI') || '). Follow up with the customer.',
                false, now()
         FROM bookings b CROSS JOIN "user" u
         WHERE b.id = ANY($1::text[]) AND u.role IN ('owner','admin','staff')`,
        [ids],
      )
      updated = ids.length
    }

    await client.query('COMMIT')
  } catch {
    await client.query('ROLLBACK')
    return { updatedBookings: 0 }
  } finally {
    client.release()
  }

  if (updated > 0) {
    await logActivity({
      action: 'bookings_marked_overdue', entity: 'booking',
      metadata: { count: updated, automated: true },
    })
  }
  return { updatedBookings: updated }
}