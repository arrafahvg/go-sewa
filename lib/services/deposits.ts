import { eq, desc, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { bookings, deposits, depositTransactions } from '@/lib/db/schema'
import { logActivity, uid } from './audit'

/**
 * Deposit lifecycle management (§13, §16).
 * Deposits are held at check-out, returned at check-in, and may be partially
 * forfeited for late fees or damage. Status lives on the `deposits` row
 * (deposit_status enum); every movement is a row in `deposit_transactions`
 * and is audit-logged (§63).
 */

export type DepositTxnKind = 'held' | 'returned' | 'forfeited'

export type DepositInput = {
  bookingId: string
  kind: DepositTxnKind
  amountCents: number
  note?: string
  byUserId: string
}

/** Get (or lazily create) the deposit record for a booking. */
async function getOrCreateDeposit(bookingId: string) {
  const found = await db.select().from(deposits).where(eq(deposits.bookingId, bookingId)).limit(1)
  if (found.length) return found[0]

  const booking = await db
    .select({ id: bookings.id, depositCents: bookings.depositCents })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1)
  if (!booking.length) throw new Error('Booking not found.')

  const id = uid()
  await db.insert(deposits).values({
    id,
    bookingId,
    amountCents: booking[0].depositCents,
    status: booking[0].depositCents > 0 ? 'pending' : 'not_required',
  })
  const created = await db.select().from(deposits).where(eq(deposits.id, id)).limit(1)
  return created[0]
}

/** Record a deposit movement and recompute the deposit's status. */
export async function recordDeposit(input: DepositInput) {
  if (!['held', 'returned', 'forfeited'].includes(input.kind)) {
    throw new Error('Unknown deposit action.')
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error('Deposit amount must be a positive integer amount.')
  }

  const deposit = await getOrCreateDeposit(input.bookingId)
  if (input.amountCents > deposit.amountCents) {
    throw new Error(`Amount cannot exceed the held deposit (${formatRp(deposit.amountCents)}).`)
  }

  const transactionId = uid()
  await db.insert(depositTransactions).values({
    id: transactionId,
    depositId: deposit.id,
    kind: input.kind,
    amountCents: input.amountCents,
    note: input.note ?? null,
    createdById: input.byUserId,
    createdAt: new Date(),
  })

  // Recompute deposit status from the transaction history
  const totals = await db
    .select({
      returned: sql<number>`coalesce(sum(case when ${depositTransactions.kind} = 'returned' then ${depositTransactions.amountCents} else 0 end), 0)::int`,
      forfeited: sql<number>`coalesce(sum(case when ${depositTransactions.kind} = 'forfeited' then ${depositTransactions.amountCents} else 0 end), 0)::int`,
      heldTxns: sql<number>`coalesce(sum(case when ${depositTransactions.kind} = 'held' then ${depositTransactions.amountCents} else 0 end), 0)::int`,
    })
    .from(depositTransactions)
    .where(eq(depositTransactions.depositId, deposit.id))

  const t = totals[0]
  const effectiveHeld = Math.max(deposit.amountCents, Number(t?.heldTxns ?? 0))
  const returned = Number(t?.returned ?? 0)
  const forfeited = Number(t?.forfeited ?? 0)

  let status = deposit.status
  if (deposit.amountCents <= 0 && heldTxnsZero(t)) {
    status = 'not_required'
  } else if (returned >= effectiveHeld) {
    status = 'returned'
  } else if (forfeited >= effectiveHeld) {
    status = 'forfeited'
  } else if (returned > 0 && forfeited > 0) {
    status = 'partially_forfeited'
  } else if (returned > 0) {
    status = 'partially_returned'
  } else if (input.kind === 'held') {
    status = 'held'
  } else if (forfeited > 0) {
    status = 'partially_forfeited'
  } else {
    status = 'held'
  }

  await db.update(deposits).set({ status, updatedAt: new Date() }).where(eq(deposits.id, deposit.id))
  await db.update(bookings).set({ updatedAt: new Date() }).where(eq(bookings.id, input.bookingId))

  await logActivity({
    userId: input.byUserId,
    action: `deposit_${input.kind}`,
    entity: 'deposit',
    entityId: deposit.id,
    metadata: { bookingId: input.bookingId, kind: input.kind, amountCents: input.amountCents },
  })

  return transactionId
}

function heldTxnsZero(t?: { heldTxns?: number }): boolean {
  return !t || Number(t.heldTxns ?? 0) <= 0
}

function formatRp(cents: number): string {
  return `Rp ${cents.toLocaleString('id-ID')}`
}

/** Current deposit state for a booking (null when none exists yet). */
export async function getDeposit(bookingId: string) {
  const rows = await db.select().from(deposits).where(eq(deposits.bookingId, bookingId)).limit(1)
  return rows[0] ?? null
}

/** Deposit transaction history for a booking, newest first. */
export async function getDepositHistory(bookingId: string) {
  const deposit = await getOrCreateDeposit(bookingId)
  return db
    .select()
    .from(depositTransactions)
    .where(eq(depositTransactions.depositId, deposit.id))
    .orderBy(desc(depositTransactions.createdAt))
}
