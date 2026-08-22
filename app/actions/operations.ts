'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import {
  checkOutDevice, checkInDevice, recordInspection, assignDevices, updateBookingStatus,
} from '@/lib/services/operations'

async function staffId(): Promise<string | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    return session?.user?.id ?? null
  } catch {
    return null
  }
}

function refresh(bookingId?: string) {
  revalidatePath('/admin')
  revalidatePath('/admin/bookings')
  if (bookingId) revalidatePath(`/admin/bookings/${bookingId}`)
}

export async function checkOutDeviceAction(input: {
  bookingId: string; deviceId: string; condition?: string; notes?: string
}) {
  const result = await checkOutDevice({ ...input, byUserId: await staffId() })
  refresh(input.bookingId)
  return result
}

export async function checkInDeviceAction(input: {
  bookingId: string; deviceId: string; condition?: string
  missingAccessories?: string[]; damageNoted?: boolean; notes?: string
}) {
  const result = await checkInDevice({ ...input, byUserId: await staffId() })
  refresh(input.bookingId)
  return result
}

export async function inspectDeviceAction(input: {
  deviceId: string; bookingId?: string; passed: boolean; notes?: string
}) {
  const items = input.notes ? [{ label: 'Inspector notes', ok: input.passed, note: input.notes }] : []
  const result = await recordInspection({
    deviceId: input.deviceId, bookingId: input.bookingId ?? null,
    passed: input.passed, items, byUserId: await staffId(),
  })
  refresh(input.bookingId)
  return result
}

export async function assignDevicesAction(input: { bookingId: string; deviceIds: string[] }) {
  const result = await assignDevices({ ...input, byUserId: await staffId() })
  refresh(input.bookingId)
  return result
}

export async function updateBookingStatusAction(input: { bookingId: string; status: string }) {
  const result = await updateBookingStatus({ ...input, byUserId: await staffId() })
  refresh(input.bookingId)
  return result
}