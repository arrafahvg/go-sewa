'use server'

import { requireStaff } from '@/lib/services/auth'
import { generateInvoiceForBooking, setInvoiceStatus, createManualInvoice } from '@/lib/services/invoices'

type Result = { ok: true } | { ok: false; error: string }

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong. Please try again.' }
}

/**
 * Staff-create a booking-less invoice (spec §35): pick/reuse a customer and enter
 * free-form line items. The service resolves/creates the customer and stores the
 * totals; amounts are server-validated — nothing trusted from the client.
 */
export async function createManualInvoiceAction(input: {
  customerId?: string | null
  customerName: string
  customerPhone?: string | null
  customerEmail?: string | null
  lines: { description: string; quantity: number; unitPrice: number }[]
  dueAt?: string | null
}): Promise<{ ok: true; invoiceId: string } | { ok: false; error: string }> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to create invoices.' }
  try {
    // Client sends plain rupiah amounts; convert to minor units the same way the
    // pricing-adjust / maintenance forms do (enter Rp → store ×100).
    const lines = input.lines.map((l) => ({
      description: l.description,
      quantity: Math.max(1, Number(l.quantity) || 1),
      unitPriceCents: Math.max(0, Math.round((Number(l.unitPrice) || 0) * 100)),
    }))
    const result = await createManualInvoice({
      customerId: input.customerId ?? null,
      customerName: input.customerName,
      customerPhone: input.customerPhone || null,
      customerEmail: input.customerEmail || null,
      lines,
      dueAt: input.dueAt && !Number.isNaN(new Date(input.dueAt).getTime()) ? new Date(input.dueAt) : null,
      byUserId: staff.id,
    })
    return { ok: true, invoiceId: result.id }
  } catch (e) {
    return fail(e)
  }
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
