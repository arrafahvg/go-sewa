'use server'

import { requireStaff } from '@/lib/services/auth'
import { generateAgreementForBooking, setAgreementStatus, createManualAgreement } from '@/lib/services/agreements'

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong. Please try again.' }
}

/**
 * Staff-create a booking-less rental agreement (spec §21/§35): pick/reuse a
 * customer and enter free-form equipment/terms lines. The service resolves or
 * creates the customer, merges the active template, and stores the draft.
 */
export async function createManualAgreementAction(input: {
  customerId?: string | null
  customerName: string
  customerPhone?: string | null
  customerEmail?: string | null
  lines: { description: string; quantity: number }[]
}): Promise<{ ok: true; agreementId: string } | { ok: false; error: string }> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to create agreements.' }
  try {
    const lines = input.lines.map((l) => ({
      description: l.description,
      quantity: Math.max(1, Math.floor(Number(l.quantity) || 1)),
    }))
    const result = await createManualAgreement({
      customerId: input.customerId ?? null,
      customerName: input.customerName,
      customerPhone: input.customerPhone || null,
      customerEmail: input.customerEmail || null,
      lines,
      byUserId: staff.id,
    })
    return { ok: true, agreementId: result.id }
  } catch (e) {
    return fail(e)
  }
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
