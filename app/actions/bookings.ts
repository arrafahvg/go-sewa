'use server'

import { auth } from '@/lib/auth'
import { createBooking, type BookingChannel } from '@/lib/services/bookings'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getOptionalUserId(): Promise<string | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    return session?.user?.id ?? null
  } catch {
    return null
  }
}

/** Public checkout submission. Runs through the real availability + conflict logic. */
export async function submitBooking(input: {
  customerName: string
  customerPhone?: string
  customerEmail?: string
  productId: string
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
}) {
  const result = await createBooking({
    customerName: input.customerName,
    customerPhone: input.customerPhone || null,
    customerEmail: input.customerEmail || null,
    productId: input.productId,
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
  })
  return result
}

/** Admin walk-in / phone / whatsapp booking (spec §19B) — same service, only channel differs. */
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
}) {
  const staffId = await getOptionalUserId()
  const result = await createBooking({
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
    createdById: staffId,
  })
  revalidatePath('/admin')
  return result
}
