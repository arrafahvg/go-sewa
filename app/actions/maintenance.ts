'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/services/auth'
import {
  createMaintenance, completeMaintenance, reportDamage, resolveDamageReport,
} from '@/lib/services/devices'

/**
 * Maintenance & damage operations (§7–9). Staff-guarded (RBAC §54); business
 * logic lives in lib/services/devices.ts (§59); every write is audit-logged (§63).
 */
type Result = { ok: true } | { ok: false; error: string }

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong. Please try again.' }
}

function refresh() {
  revalidatePath('/admin')
  revalidatePath('/admin/maintenance')
  revalidatePath('/admin/inventory')
}

export async function createMaintenanceAction(input: {
  deviceId: string
  description: string
  type?: string
  scheduledAt?: string
}): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to manage maintenance.' }
  try {
    await createMaintenance({
      deviceId: input.deviceId,
      description: input.description,
      type: input.type ?? 'repair',
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      byUserId: staff.id,
    })
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function completeMaintenanceAction(input: { id: string; costCents?: number }): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to manage maintenance.' }
  try {
    await completeMaintenance({ id: input.id, costCents: input.costCents ?? 0, byUserId: staff.id })
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function reportDamageAction(input: {
  deviceId: string
  description: string
  bookingId?: string
  severity?: string
}): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to manage damage.' }
  try {
    await reportDamage({
      deviceId: input.deviceId,
      bookingId: input.bookingId ?? null,
      description: input.description,
      severity: input.severity ?? 'minor',
      byUserId: staff.id,
    })
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function resolveDamageAction(input: { id: string; chargeCents?: number; description?: string }): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to manage damage.' }
  try {
    await resolveDamageReport({
      id: input.id,
      chargeCents: input.chargeCents ?? 0,
      description: input.description,
      byUserId: staff.id,
    })
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}