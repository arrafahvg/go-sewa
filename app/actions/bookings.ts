'use server'

import { createBooking, type BookingChannel } from '@/lib/services/bookings'
import { requireStaff } from '@/lib/services/auth'
import { revalidatePath } from 'next/cache'

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
}) {
  const result = await createBooking({
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
}) {
  const staff = await requireStaff()
  if (!staff) return { ok: false as const, error: 'You do not have permission to create admin bookings.' }
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
    createdById: staff.id,
  })
  revalidatePath('/admin')
  return result
}
