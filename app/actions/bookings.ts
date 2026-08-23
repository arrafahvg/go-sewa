'use server'

import { createBooking, type BookingChannel } from '@/lib/services/bookings'
import { getCurrentUser, requireStaff } from '@/lib/services/auth'
import { getSetting } from '@/lib/services/settings'
import { db } from '@/lib/db'
import { customerDocuments, products } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

/**
 * Server-side enforcement of the identity-document-as-collateral policy (§19,
 * §73, §56): a stored identity document is required when (a) the global
 * `identity_document_required` setting is on, OR (b) any product in the cart
 * has `deposit_required` (that flag forces an ID document + deposit hold).
 * The document id must really exist in customer_documents — never trusted
 * from the client.
 *
 * @param productIds physical rentable product ids in the cart
 * @param documentId customer_documents id uploaded during checkout (nullable)
 */
async function assertIdentityDocument(productIds: string[], documentId?: string): Promise<string | null> {
  const requiredBySetting = (await getSetting('identity_document_required')) !== 'false'

  let forcedByProduct = false
  if (productIds.length) {
    const rows = await db
      .select({ depositRequired: products.depositRequired })
      .from(products).where(inArray(products.id, [...new Set(productIds.filter(Boolean))]))
    forcedByProduct = rows.some((r) => r.depositRequired)
  }

  if (!requiredBySetting && !forcedByProduct) return null
  if (!documentId) {
    return 'An identity document photo (KTP or SIM) is required to complete this rental.'
  }
  const rows = await db.select({ id: customerDocuments.id })
    .from(customerDocuments).where(eq(customerDocuments.id, documentId)).limit(1)
  if (rows.length === 0) {
    return 'The uploaded identity document could not be verified. Please upload it again.'
  }
  return null
}

/** Public checkout submission. Accepts multi-line carts; runs through the real availability + conflict logic. */
export async function submitBooking(input: {
  customerName: string
  customerPhone?: string
  customerEmail?: string
  productId?: string
  items?: { productId: string; quantity?: number; addOnIds?: string[] }[]
  startsAt: string
  endsAt: string
  quantity?: number
  addOnIds?: string[]
  fulfillment?: 'pickup' | 'delivery'
  returnMethod?: string
  deliveryAddress?: string
  recipientName?: string
  recipientPhone?: string
  deliveryNotes?: string
  deliveryFeeCents?: number
  agreementAccepted?: boolean
  identityDocumentId?: string
  customerId?: string
}) {
  // Link the booking's customer record to the signed-in account when there is one,
  // so customers can see their bookings under /account/bookings (§54, §78).
  const current = await getCurrentUser()
  const productIds = (input.items?.map((i) => i.productId) ?? []).concat(input.productId ? [input.productId] : [])
  const docError = await assertIdentityDocument(productIds, input.identityDocumentId)
  if (docError) return { ok: false as const, error: docError }
  const result = await createBooking({
    customerId: input.customerId ?? null,
    customerName: input.customerName,
    customerPhone: input.customerPhone || null,
    customerEmail: input.customerEmail || null,
    productId: input.productId,
    items: input.items,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    quantity: input.quantity ?? 1,
    addOnIds: input.addOnIds ?? [],
    fulfillment: input.fulfillment,
    returnMethod: input.returnMethod,
    deliveryAddress: input.deliveryAddress ?? null,
    recipientName: input.recipientName ?? null,
    recipientPhone: input.recipientPhone ?? null,
    deliveryNotes: input.deliveryNotes ?? null,
    deliveryFeeCents: input.deliveryFeeCents ?? 0,
    channel: 'online',
    agreementAccepted: input.agreementAccepted ?? false,
    userId: current?.id ?? null,
  })
  return result
}

/** Admin walk-in / phone / whatsapp booking (spec §19B) — staff-only, same service, only channel differs. */
export async function submitAdminBooking(input: {
  customerName: string
  customerPhone?: string
  customerEmail?: string
  customerIdNumber?: string
  productId: string
  startsAt: string
  endsAt: string
  quantity?: number
  preferredDeviceIds?: string[]
  addOnIds?: string[]
  fulfillment?: 'pickup' | 'delivery'
  returnMethod?: string
  deliveryAddress?: string
  recipientName?: string
  recipientPhone?: string
  discountCents?: number
  discountReason?: string
  channel?: BookingChannel
  notes?: string
  identityDocumentId?: string
  customerId?: string
}) {
  const staff = await requireStaff()
  if (!staff) return { ok: false as const, error: 'You do not have permission to create admin bookings.' }
  const docError = await assertIdentityDocument(input.productId ? [input.productId] : [], input.identityDocumentId)
  if (docError) return { ok: false as const, error: docError }
  const result = await createBooking({
    customerId: input.customerId ?? null,
    customerName: input.customerName,
    customerPhone: input.customerPhone || null,
    customerEmail: input.customerEmail || null,
    customerIdNumber: input.customerIdNumber || null,
    productId: input.productId,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    quantity: input.quantity ?? 1,
    preferredDeviceIds: input.preferredDeviceIds ?? [],
    addOnIds: input.addOnIds ?? [],
    fulfillment: input.fulfillment,
    returnMethod: input.returnMethod,
    deliveryAddress: input.deliveryAddress ?? null,
    recipientName: input.recipientName ?? null,
    recipientPhone: input.recipientPhone ?? null,
    discountCents: input.discountCents ?? 0,
    discountReason: input.discountReason ?? null,
    channel: input.channel ?? 'in_store',
    notes: input.notes ?? null,
    createdById: staff.id,
  })
  revalidatePath('/admin')
  return result
}
