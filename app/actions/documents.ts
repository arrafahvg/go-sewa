'use server'

import { requireStaff } from '@/lib/services/auth'
import { getSetting } from '@/lib/services/settings'
import {
  uploadIdentityDocument, getIdentityDocumentSignedUrl, verifyIdentityDocument,
  IDENTITY_TYPES, type IdentityType,
} from '@/lib/services/documents'
import { revalidatePath } from 'next/cache'
import { createShareToken, revokeShareToken } from '@/lib/services/share'

export type IdentityUploadInput = {
  customerId?: string
  customerName: string
  customerPhone?: string
  idType: string
  idNumber: string
  fileBase64: string
  mimeType: string
}

/** Public upload used by online checkout and the staff walk-in form. Server-validated. */
export async function uploadIdentityDocumentAction(input: IdentityUploadInput) {
  const idType = input.idType as IdentityType
  if (!IDENTITY_TYPES.includes(idType)) return { ok: false as const, error: 'Unknown document type.' }
  // Enforce the configurable allowed types (§73) — never hardcode policy in UI.
  const configured = (await getSetting('identity_document_types'))
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  if (configured.length > 0 && !configured.includes(idType)) {
    return { ok: false as const, error: 'This document type is not accepted.' }
  }
  return uploadIdentityDocument({
    customerId: input.customerId ?? null,
    customerName: input.customerName,
    customerPhone: input.customerPhone ?? null,
    idType, idNumber: input.idNumber,
    fileBase64: input.fileBase64, mimeType: input.mimeType,
  })
}

/** Staff-only: short-lived signed URL to review a stored document. */
export async function getIdentityDocumentUrlAction(documentId: string) {
  const staff = await requireStaff()
  if (!staff) return { ok: false as const, error: 'Not authorized.' }
  const url = await getIdentityDocumentSignedUrl(documentId)
  if (!url) return { ok: false as const, error: 'Document not found or storage unavailable.' }
  return { ok: true as const, url }
}

/** Staff-only verification toggle (audit-logged). */
export async function verifyIdentityDocumentAction(customerId: string) {
  const staff = await requireStaff()
  if (!staff) return { ok: false as const, error: 'Not authorized.' }
  const done = await verifyIdentityDocument(customerId, staff.id)
  if (!done) return { ok: false as const, error: 'Customer not found.' }
  revalidatePath('/admin')
  revalidatePath('/admin/bookings')
  return { ok: true as const }
}

/** Staff-only share-token actions (§63 audit-logged). */
export async function createShareTokenAction(kind: string, id: string) {
  const staff = await requireStaff()
  if (!staff) return { ok: false as const, error: 'Not authorized.' }
  if (kind !== 'invoice' && kind !== 'agreement') return { ok: false as const, error: 'Unknown document type.' }
  const token = await createShareToken(kind, id, staff.id)
  if (!token) return { ok: false as const, error: 'Document not found.' }
  return { ok: true as const, token }
}

export async function revokeShareTokenAction(kind: string, id: string) {
  const staff = await requireStaff()
  if (!staff) return { ok: false as const, error: 'Not authorized.' }
  if (kind !== 'invoice' && kind !== 'agreement') return { ok: false as const, error: 'Unknown document type.' }
  const done = await revokeShareToken(kind, id, staff.id)
  if (!done) return { ok: false as const, error: 'Document not found.' }
  revalidatePath(`/admin/${kind === 'invoice' ? 'invoices' : 'agreements'}/${id}`)
  return { ok: true as const }
}
