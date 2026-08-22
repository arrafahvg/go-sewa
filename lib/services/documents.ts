import { createClient } from '@supabase/supabase-js'
import { db } from '@/lib/db'
import { customerDocuments, customers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { uid, logActivity } from './audit'

/**
 * Identity document (KTP / SIM / passport) handling — the collateral a customer
 * leaves when renting (spec §19 identity verification, §2528 secure document
 * handling). Files live in a PRIVATE Supabase Storage bucket; access is only
 * ever through short-lived signed URLs generated server-side for staff.
 *
 * §80 honesty note: if SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not
 * configured, uploads fail loudly with an explicit configuration error —
 * the system never pretends a document was stored.
 */

export const IDENTITY_TYPES = ['ktp', 'sim', 'passport'] as const
export type IdentityType = (typeof IDENTITY_TYPES)[number]

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

function storageConfig(): { url: string; key: string; bucket: string } | null {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return { url, key, bucket: process.env.SUPABASE_ID_DOCS_BUCKET ?? 'identity-documents' }
}

export function isDocumentStorageConfigured(): boolean {
  return storageConfig() !== null
}

export type UploadIdentityInput = {
  customerId?: string | null      // existing customer (walk-in pick / signed-in)
  customerName: string
  customerPhone?: string | null
  idType: IdentityType
  idNumber: string
  fileBase64: string              // raw base64 (no data: prefix)
  mimeType: string
}

export type UploadIdentityResult =
  | { ok: true; documentId: string; customerId: string }
  | { ok: false; error: string }

/** Validate + upload one identity document photo and attach it to the customer. */
export async function uploadIdentityDocument(input: UploadIdentityInput): Promise<UploadIdentityResult> {
  if (!IDENTITY_TYPES.includes(input.idType)) return { ok: false, error: 'Unknown document type.' }
  if (!input.idNumber.trim()) return { ok: false, error: 'Document number is required.' }
  if (!ALLOWED_MIME.includes(input.mimeType)) {
    return { ok: false, error: 'Only JPG, PNG, WebP or HEIC photos are accepted.' }
  }
  const bytes = Buffer.from(input.fileBase64, 'base64')
  if (bytes.length === 0) return { ok: false, error: 'The document photo is empty.' }
  if (bytes.length > MAX_BYTES) return { ok: false, error: 'The document photo must be under 5 MB.' }

  // Resolve or create the customer record (same reuse rule as bookings: phone first).
  let customerId = input.customerId ?? null
  if (!customerId) {
    const phone = input.customerPhone?.trim() ?? ''
    if (phone) {
      const found = await db.select({ id: customers.id }).from(customers)
        .where(eq(customers.phone, phone)).limit(1)
      customerId = found[0]?.id ?? null
    }
    if (!customerId) {
      if (!input.customerName.trim()) return { ok: false, error: 'Customer name is required.' }
      customerId = uid()
      await db.insert(customers).values({
        id: customerId, name: input.customerName.trim(),
        phone: input.customerPhone ?? null,
        idType: input.idType, idNumber: input.idNumber.trim(),
      })
    }
  }

  const cfg = storageConfig()
  if (!cfg) {
    return { ok: false, error: 'Document storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' }
  }

  const supabase = createClient(cfg.url, cfg.key, { auth: { persistSession: false } })
  const documentId = uid()
  const ext = input.mimeType === 'image/png' ? 'png'
    : input.mimeType === 'image/webp' ? 'webp'
    : input.mimeType.includes('heic') ? 'heic'
    : input.mimeType.includes('heif') ? 'heif' : 'jpg'
  const path = `${customerId}/${documentId}.${ext}`
  const { error: upErr } = await supabase.storage
    .from(cfg.bucket)
    .upload(path, bytes, { contentType: input.mimeType, upsert: false })
  if (upErr) {
    await logActivity({ userId: null, action: 'identity_document_upload_failed', entity: 'customer', entityId: customerId, metadata: { error: upErr.message } })
    return { ok: false, error: 'Could not store the document photo. Please try again.' }
  }

  await db.insert(customerDocuments).values({
    id: documentId, customerId, url: path,
    kind: `identity:${input.idType}:${input.idNumber.trim()}`,
  })
  await db.update(customers).set({
    idType: input.idType, idNumber: input.idNumber.trim(), updatedAt: new Date(),
  }).where(eq(customers.id, customerId))

  await logActivity({
    userId: null, action: 'identity_document_uploaded', entity: 'customer',
    entityId: customerId, metadata: { documentId, idType: input.idType },
  })
  return { ok: true, documentId, customerId }
}

/** Short-lived signed URL for staff review — never a public link. */
export async function getIdentityDocumentSignedUrl(documentId: string): Promise<string | null> {
  const cfg = storageConfig()
  if (!cfg) return null
  const rows = await db.select().from(customerDocuments).where(eq(customerDocuments.id, documentId)).limit(1)
  const doc = rows[0]
  if (!doc) return null
  const supabase = createClient(cfg.url, cfg.key, { auth: { persistSession: false } })
  const { data, error } = await supabase.storage.from(cfg.bucket).createSignedUrl(doc.url, 15 * 60)
  if (error || !data) return null
  return data.signedUrl
}

/** Staff verification of a customer's identity document (audit-logged, §63). */
export async function verifyIdentityDocument(customerId: string, verifiedBy: string): Promise<boolean> {
  const res = await db.update(customers)
    .set({ idVerified: true, updatedAt: new Date() })
    .where(eq(customers.id, customerId))
    .returning({ id: customers.id })
  if (res.length === 0) return false
  await logActivity({
    userId: verifiedBy, action: 'identity_document_verified', entity: 'customer',
    entityId: customerId, metadata: {},
  })
  return true
}
