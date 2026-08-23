'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/services/auth'
import { recordPayment, type PaymentMethod } from '@/lib/services/payments'

/**
 * Payment recording actions (§16). Wraps lib/services/payments.ts behind the
 * staff RBAC guard (§54). Paid status is derived from payment history vs. the
 * booking total — there is no stored status column to trust (§81).
 */
const PAYMENT_METHODS = ['cash', 'transfer', 'qris', 'ewallet', 'other'] as const

export async function recordPaymentAction(input: {
  bookingId: string
  method: string
  amountCents: number
  note?: string
}) {
  const staff = await requireStaff()
  if (!staff) return { ok: false as const, error: 'You do not have permission to record payments.' }
  if (!PAYMENT_METHODS.includes(input.method as PaymentMethod)) {
    return { ok: false as const, error: 'Unknown payment method.' }
  }
  try {
    await recordPayment({
      bookingId: input.bookingId,
      method: input.method as PaymentMethod,
      amountCents: input.amountCents,
      note: input.note,
      byUserId: staff.id,
    })
    revalidatePath('/admin')
    revalidatePath(`/admin/bookings/${input.bookingId}`)
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Payment recording failed. Please try again.' }
  }
}