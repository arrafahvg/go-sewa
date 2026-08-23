'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { bookings } from '@/lib/db/schema'
import { requireStaff } from '@/lib/services/auth'
import { recordDeposit, type DepositTxnKind } from '@/lib/services/deposits'

/**
 * Deposit lifecycle actions (§13, §16). Wraps lib/services/deposits.ts behind
 * the staff RBAC guard (§54); every movement is audit-logged by the service.
 * The client is never trusted — the amount is re-validated on the server.
 */
export async function recordDepositAction(input: {
  bookingId: string
  kind: DepositTxnKind
  amountCents?: number
  note?: string
}) {
  const staff = await requireStaff()
  if (!staff) return { ok: false as const, error: 'You do not have permission to manage deposits.' }
  if (!['held', 'returned', 'forfeited'].includes(input.kind)) {
    return { ok: false as const, error: 'Unknown deposit action.' }
  }
  try {
    // "Held" defaults to the whole booking deposit so staff can't under-hold.
    let amount = input.amountCents
    if (input.kind === 'held' && (amount === undefined || amount <= 0)) {
      const row = await db
        .select({ depositCents: bookings.depositCents })
        .from(bookings).where(eq(bookings.id, input.bookingId)).limit(1)
      amount = row[0]?.depositCents ?? 0
    }
    if (!amount || amount <= 0) {
      return { ok: false as const, error: 'Enter a valid deposit amount in Rupiah.' }
    }
    await recordDeposit({
      bookingId: input.bookingId,
      kind: input.kind,
      amountCents: amount,
      note: input.note,
      byUserId: staff.id,
    })
    revalidatePath('/admin')
    revalidatePath(`/admin/bookings/${input.bookingId}`)
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Deposit action failed. Please try again.' }
  }
}