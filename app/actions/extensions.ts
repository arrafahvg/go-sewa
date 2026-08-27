'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/services/auth'
import { extendBooking, listExtensions } from '@/lib/services/extensions'

type Result = { ok: true } | { ok: false; error: string }

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong. Please try again.' }
}

/**
 * Admin-approved rental extension (§29). Availability is re-checked server-side
 * over the requested window; a conflicting period is refused with the
 * customer-safe message and nothing is mutated.
 */
export async function extendBookingAction(input: {
  bookingId: string
  newEndsAt: string   // ISO date (end of rental, exclusive)
  reason?: string
}): Promise<Result & { additionalCents?: number }> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to extend bookings.' }
  try {
    const newEndsAt = new Date(input.newEndsAt)
    const res = await extendBooking({ bookingId: input.bookingId, newEndsAt, reason: input.reason }, staff.id)
    revalidatePath(`/admin/bookings/${input.bookingId}`)
    return { ok: true, additionalCents: res.additionalCents }
  } catch (e) {
    return fail(e)
  }
}

/** Extension history for a booking. */
export async function listExtensionsAction(bookingId: string) {
  const staff = await requireStaff()
  if (!staff) return []
  try {
    const rows = await listExtensions(bookingId)
    return rows.map((r) => ({
      id: r.id,
      previousEndsAt: r.previousEndsAt.toISOString(),
      newEndsAt: r.newEndsAt.toISOString(),
      additionalCents: r.additionalCents,
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
    }))
  } catch {
    return []
  }
}
