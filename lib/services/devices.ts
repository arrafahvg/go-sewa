import { and, eq } from 'drizzle-orm'
import { db, pool } from '@/lib/db'
import { devices, deviceMaintenance, deviceDamageReports, activityLogs } from '@/lib/db/schema'
import { logActivity } from './audit'

export type DeviceStatus =
  'available' | 'reserved' | 'rented' | 'overdue' | 'returning' | 'inspection'
  | 'maintenance' | 'damaged' | 'lost' | 'retired' | 'blocked'

const TRANSITIONABLE_TO = new Set<DeviceStatus>([
  'available', 'reserved', 'rented', 'overdue', 'returning', 'inspection',
  'maintenance', 'damaged', 'lost', 'retired', 'blocked',
])

export async function getDevice(deviceId: string) {
  return (await db.select().from(devices).where(eq(devices.id, deviceId)))[0] ?? null
}

export async function getDeviceByAssetCode(assetCode: string) {
  return (await db.select().from(devices).where(eq(devices.assetCode, assetCode)))[0] ?? null
}

/**
 * Transition a physical device to a new status. Records who did it and why, then
 * appends to the audit log (spec §4, §63). The check-out/check-in services call
 * this so status stays consistent with rental operations.
 */
export async function setDeviceStatus(
  deviceId: string,
  status: DeviceStatus,
  opts: { byUserId?: string | null; currentBookingId?: string | null } = {},
): Promise<void> {
  if (!TRANSITIONABLE_TO.has(status)) throw new Error(`Unknown device status: ${status}`)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `UPDATE devices SET status = $1, current_booking_id = $2, updated_at = now() WHERE id = $3`,
      [status, opts.currentBookingId ?? null, deviceId],
    )
    await client.query(
      `INSERT INTO activity_logs (id, user_id, action, entity, entity_id, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())`,
      [crypto.randomUUID(), opts.byUserId ?? null, `device_status_${status}`, 'device', deviceId,
        JSON.stringify({ status, previous: null })],
    )
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

/** Create a maintenance record and put the device into maintenance. */
export async function createMaintenance(input: {
  deviceId: string
  description: string
  type?: string
  scheduledAt?: Date
  byUserId?: string | null
}) {
  const id = crypto.randomUUID()
  await db.insert(deviceMaintenance).values({
    id,
    deviceId: input.deviceId,
    description: input.description,
    type: input.type ?? 'repair',
    scheduledAt: input.scheduledAt ?? null,
    createdById: input.byUserId ?? null,
  })
  await setDeviceStatus(input.deviceId, 'maintenance', { byUserId: input.byUserId })
  await logActivity({
    userId: input.byUserId, action: 'maintenance_created', entity: 'device_maintenance', entityId: id,
    metadata: { description: input.description },
  })
  return { id }
}

/** Record damage and move the device out of the rentable pool. */
export async function reportDamage(input: {
  deviceId: string
  description: string
  bookingId?: string | null
  severity?: string
  byUserId?: string | null
}) {
  const id = crypto.randomUUID()
  await db.insert(deviceDamageReports).values({
    id,
    deviceId: input.deviceId,
    bookingId: input.bookingId ?? null,
    description: input.description,
    severity: input.severity ?? 'minor',
    createdById: input.byUserId ?? null,
  })
  await setDeviceStatus(input.deviceId, 'damaged', { byUserId: input.byUserId })
  await logActivity({
    userId: input.byUserId, action: 'damage_reported', entity: 'device_damage_reports', entityId: id,
    metadata: { description: input.description, severity: input.severity ?? 'minor' },
  })
  return { id }
}

/** Open maintenance jobs and unresolved damage reports (joined to asset codes). */
export async function listMaintenanceTasks() {
  const jobs = await db
    .select({
      id: deviceMaintenance.id, deviceId: deviceMaintenance.deviceId,
      type: deviceMaintenance.type, description: deviceMaintenance.description,
      costCents: deviceMaintenance.costCents, status: deviceMaintenance.status,
      scheduledAt: deviceMaintenance.scheduledAt, completedAt: deviceMaintenance.completedAt,
      assetCode: devices.assetCode,
      deviceStatus: devices.status,
    })
    .from(deviceMaintenance)
    .innerJoin(devices, eq(devices.id, deviceMaintenance.deviceId))
    .orderBy(deviceMaintenance.createdAt)

  const damage = await db
    .select({
      id: deviceDamageReports.id, deviceId: deviceDamageReports.deviceId,
      bookingId: deviceDamageReports.bookingId, description: deviceDamageReports.description,
      severity: deviceDamageReports.severity, chargeCents: deviceDamageReports.chargeCents,
      resolved: deviceDamageReports.resolved,
      assetCode: devices.assetCode,
      deviceStatus: devices.status,
    })
    .from(deviceDamageReports)
    .innerJoin(devices, eq(devices.id, deviceDamageReports.deviceId))
    .orderBy(deviceDamageReports.createdAt)

  return { jobs, damage }
}

/** Complete a maintenance job: mark done and return the device to available. */
export async function completeMaintenance(input: {
  id: string
  costCents?: number
  byUserId?: string | null
}) {
  const row = (await db.select().from(deviceMaintenance).where(eq(deviceMaintenance.id, input.id)))[0]
  if (!row) throw new Error('Maintenance job not found.')
  if (row.status === 'done') throw new Error('This maintenance job is already completed.')

  await db.update(deviceMaintenance)
    .set({ status: 'done', costCents: input.costCents ?? row.costCents, completedAt: new Date() })
    .where(eq(deviceMaintenance.id, input.id))

  // Return the device to the rentable pool after service.
  await setDeviceStatus(row.deviceId, 'available', { byUserId: input.byUserId })
  await logActivity({
    userId: input.byUserId ?? null, action: 'maintenance_completed', entity: 'device_maintenance', entityId: input.id,
    metadata: { deviceId: row.deviceId, costCents: input.costCents ?? row.costCents },
  })
  return { id: input.id }
}

/** Resolve a damage report (optionally writing a charge) and return the device to available. */
export async function resolveDamageReport(input: {
  id: string
  chargeCents?: number
  description?: string
  byUserId?: string | null
}) {
  const report = (await db.select().from(deviceDamageReports).where(eq(deviceDamageReports.id, input.id)))[0]
  if (!report) throw new Error('Damage report not found.')
  if (report.resolved) throw new Error('This damage report is already resolved.')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `UPDATE device_damage_reports SET resolved = true, charge_cents = $1 WHERE id = $2`,
      [(input.chargeCents ?? 0), input.id],
    )
    // Optionally record a damage charge line item (§ financials).
    if ((input.chargeCents ?? 0) > 0) {
      await client.query(
        `INSERT INTO damage_charges (id, booking_id, device_id, description, amount_cents, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', now())`,
        [crypto.randomUUID(), report.bookingId ?? null, report.deviceId,
          input.description ?? report.description, input.chargeCents ?? 0],
      )
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }

  // Reopening the device for rent.
  await setDeviceStatus(report.deviceId, 'available', { byUserId: input.byUserId })
  await logActivity({
    userId: input.byUserId ?? null, action: 'damage_resolved', entity: 'device_damage_reports', entityId: input.id,
    metadata: { deviceId: report.deviceId, chargeCents: input.chargeCents ?? 0 },
  })
  return { id: input.id }
}

// Re-export so dependents can reference the table for joins in one import.
export { activityLogs }