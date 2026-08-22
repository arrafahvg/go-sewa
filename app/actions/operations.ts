'use server'

import { revalidatePath } from 'next/cache'
import {
  checkOutDevice, checkInDevice, recordInspection, assignDevices, updateBookingStatus,
} from '@/lib/services/operations'
import { requireStaff } from '@/lib/services/auth'

/** Staff-only guard for every admin operation (§54). */
async function staffId(): Promise<string | null> {
  const staff = await requireStaff()
  return staff?.id ?? null
}

function unauthorized() {
  return { ok: false as const, error: 'You do not have permission to perform this action.' }
}

function refresh(bookingId?: string) {
  revalidatePath('/admin')
  revalidatePath('/admin/bookings')
  if (bookingId) revalidatePath(`/admin/bookings/${bookingId}`)
}

export async function checkOutDeviceAction(input: {
  bookingId: string; deviceId: string; condition?: string; notes?: string
}) {
  const byUserId = await staffId()
  if (!byUserId) return unauthorized()
  const result = await checkOutDevice({ ...input, byUserId })
  refresh(input.bookingId)
  return result
}

export async function checkInDeviceAction(input: {
  bookingId: string; deviceId: string; condition?: string
  missingAccessories?: string[]; damageNoted?: boolean; notes?: string
}) {
  const byUserId = await staffId()
  if (!byUserId) return unauthorized()
  const result = await checkInDevice({ ...input, byUserId })
  refresh(input.bookingId)
  return result
}

export async function inspectDeviceAction(input: {
  deviceId: string; bookingId?: string; passed: boolean; notes?: string
}) {
  const byUserId = await staffId()
  if (!byUserId) return unauthorized()
  const items = input.notes ? [{ label: 'Inspector notes', ok: input.passed, note: input.notes }] : []
  const result = await recordInspection({
    deviceId: input.deviceId, bookingId: input.bookingId ?? null,
    passed: input.passed, items, byUserId,
  })
  refresh(input.bookingId)
  return result
}

export async function assignDevicesAction(input: { bookingId: string; deviceIds: string[] }) {
  const byUserId = await staffId()
  if (!byUserId) return unauthorized()
  const result = await assignDevices({ ...input, byUserId })
  refresh(input.bookingId)
  return result
}

export async function updateBookingStatusAction(input: { bookingId: string; status: string }) {
  const byUserId = await staffId()
  if (!byUserId) return unauthorized()
  const result = await updateBookingStatus({ ...input, byUserId })
  refresh(input.bookingId)
  return result
}