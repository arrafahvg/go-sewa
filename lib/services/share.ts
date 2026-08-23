import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { invoices, rentalAgreements } from '@/lib/db/schema'
import { logActivity } from './audit'

/**
 * Public document sharing (spec §21B/§35): staff can mint an unguessable,
 * revocable share token for one invoice or rental agreement. The token renders
 * a read-only page at /d/[token] — no admin access, no customer PII beyond the
 * booking facts already on the printed document, no ID-document images.
 */
export type ShareKind = 'invoice' | 'agreement'

export async function createShareToken(kind: ShareKind, id: string, byUserId: string | null): Promise<string | null> {
  const token = crypto.randomUUID()
  const table = kind === 'invoice' ? invoices : rentalAgreements
  const res = await db.update(table).set({ shareToken: token }).where(eq(table.id, id)).returning({ id: table.id })
  if (res.length === 0) return null
  await logActivity({
    userId: byUserId, action: `share_token_created_${kind}`, entity: kind,
    entityId: id, metadata: {},
  })
  return token
}

export async function revokeShareToken(kind: ShareKind, id: string, byUserId: string | null): Promise<boolean> {
  const table = kind === 'invoice' ? invoices : rentalAgreements
  const res = await db.update(table).set({ shareToken: null }).where(eq(table.id, id)).returning({ id: table.id })
  if (res.length === 0) return false
  await logActivity({
    userId: byUserId, action: `share_token_revoked_${kind}`, entity: kind,
    entityId: id, metadata: {},
  })
  return true
}

/** Resolve a share token to its document (public — returns minimal data). */
export async function getSharedDocument(token: string) {
  if (!token) return null
  const inv = (await db.select().from(invoices).where(eq(invoices.shareToken, token)).limit(1))[0]
  if (inv) return { kind: 'invoice' as const, id: inv.id }
  const agr = (await db.select().from(rentalAgreements).where(eq(rentalAgreements.shareToken, token)).limit(1))[0]
  if (agr) return { kind: 'agreement' as const, id: agr.id }
  return null
}