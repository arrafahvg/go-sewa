'use server'

import { requireStaff } from '@/lib/services/auth'
import { generateAgreementForBooking, setAgreementStatus } from '@/lib/services/agreements'

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong. Please try again.' }
}

export async function generateAgreementAction(bookingId: string): Promise<{ ok: true; agreementId: string; alreadyExisted: boolean } | { ok: false; error: string }> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to create agreements.' }
  try {
    const result = await generateAgreementForBooking(bookingId, { byUserId: staff.id })
    return { ok: true, agreementId: result.id, alreadyExisted: result.alreadyExisted }
  } catch (e) {
    return fail(e)
  }
}

export async function setAgreementStatusAction(id: string, status: 'draft' | 'printed' | 'signed'): Promise<{ ok: true } | { ok: false; error: string }> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to update agreements.' }
  try {
    await setAgreementStatus(id, status, staff.id)
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}
