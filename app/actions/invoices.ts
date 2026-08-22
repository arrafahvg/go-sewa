'use server'

import { requireStaff } from '@/lib/services/auth'
import { generateInvoiceForBooking, setInvoiceStatus } from '@/lib/services/invoices'

type Result = { ok: true } | { ok: false; error: string }

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong. Please try again.' }
}

export async function generateInvoiceAction(bookingId: string): Promise<{ ok: true; invoiceId: string; alreadyExisted: boolean } | { ok: false; error: string }> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to create invoices.' }
  try {
    const result = await generateInvoiceForBooking(bookingId, { byUserId: staff.id })
    return { ok: true, invoiceId: result.id, alreadyExisted: result.alreadyExisted }
  } catch (e) {
    return fail(e)
  }
}

export async function setInvoiceStatusAction(invoiceId: string, status: 'unpaid' | 'paid' | 'void'): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to update invoices.' }
  try {
    await setInvoiceStatus(invoiceId, status, staff.id)
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}
