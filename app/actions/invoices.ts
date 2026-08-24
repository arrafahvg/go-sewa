'use server'

import { requireStaff } from '@/lib/services/auth'
import { generateInvoiceForBooking, setInvoiceStatus, createManualInvoice, setInvoicePaymentDetails } from '@/lib/services/invoices'
import { getPaymentDetails } from '@/lib/services/settings'
import { revalidatePath } from 'next/cache'

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
  /** Per-invoice payment override (§16). The client only sends *selections*
   *  (indexes into the configured list + flags) — the actual bank details and
   *  QRIS URL are re-read from settings server-side, never trusted from input. */
  payment?: {
    accountIndexes: number[]
    includeQris: boolean
    instructions?: string | null
  } | null
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
    // Resolve the per-invoice payment override from settings server-side (§16, §6).
    let payment: Awaited<Parameters<typeof createManualInvoice>[0]>['payment'] = null
    if (input.payment) {
      const configured = await getPaymentDetails()
      const seen = new Set<number>()
      const accounts = (input.payment.accountIndexes ?? [])
        .map((i) => Math.floor(Number(i)))
        .filter((i) => Number.isInteger(i) && i >= 0 && i < configured.accounts.length && !seen.has(i) && seen.add(i))
        .map((i) => configured.accounts[i])
      payment = {
        accounts,
        qrisImageUrl: input.payment.includeQris ? configured.qrisImageUrl || null : null,
        instructions: input.payment.instructions?.trim() || null,
      }
    }
    const result = await createManualInvoice({
      customerId: input.customerId ?? null,
      customerName: input.customerName,
      customerPhone: input.customerPhone || null,
      customerEmail: input.customerEmail || null,
      lines,
      dueAt: input.dueAt && !Number.isNaN(new Date(input.dueAt).getTime()) ? new Date(input.dueAt) : null,
      payment,
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
    revalidatePath(`/admin/invoices/${invoiceId}`)
    revalidatePath('/d')
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

/**
 * Set (or clear) the per-invoice manual-payment override on an existing invoice
 * (§16) — works for both manual and booking-generated invoices. The client only
 * sends selections (indexes into the configured list + flags); the actual bank
 * details and QRIS URL are re-read from settings server-side (§6).
 */
export async function updateInvoicePaymentAction(input: {
  invoiceId: string
  /** null clears the override → invoice falls back to global settings. */
  payment: {
    accountIndexes: number[]
    includeQris: boolean
    instructions?: string | null
  } | null
}): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to update invoices.' }
  try {
    let payment: Awaited<Parameters<typeof setInvoicePaymentDetails>[1]> = null
    if (input.payment) {
      const configured = await getPaymentDetails()
      const seen = new Set<number>()
      const accounts = (input.payment.accountIndexes ?? [])
        .map((i) => Math.floor(Number(i)))
        .filter((i) => Number.isInteger(i) && i >= 0 && i < configured.accounts.length && !seen.has(i) && seen.add(i))
        .map((i) => configured.accounts[i])
      payment = {
        accounts,
        qrisImageUrl: input.payment.includeQris ? configured.qrisImageUrl || null : null,
        instructions: input.payment.instructions?.trim() || null,
      }
    }
    await setInvoicePaymentDetails(input.invoiceId, payment, staff.id)
    revalidatePath(`/admin/invoices/${input.invoiceId}`)
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}
