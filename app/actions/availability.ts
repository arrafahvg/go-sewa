'use server'

import { checkAvailability } from '@/lib/services/availability'
import { quoteBooking } from '@/lib/services/pricing'
import { getAddOnAvailability } from '@/lib/services/addons'
import { rentalDays } from '@/lib/utils/dates'

/**
 * Storefront server action: returns real date-based availability + a live quote.
 * This is what the product page date picker calls when the customer changes dates.
 */
export async function checkProductAvailability(input: {
  productId: string
  startsAt: string
  endsAt: string
  quantity?: number
  addOnIds?: string[]
  /** All add-ons attached to the product — availability is computed for each (§2C). */
  allAddOnIds?: string[]
  deliveryFeeCents?: number
}) {
  const startsAt = new Date(input.startsAt)
  const endsAt = new Date(input.endsAt)

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { error: 'Invalid dates.', availability: null, quote: null }
  }
  if (endsAt.getTime() <= startsAt.getTime()) {
    return { error: 'Rental end must be after the start date.', availability: null, quote: null }
  }

  const selectedIds = input.addOnIds ?? []
  const availabilityIds = [...new Set([...selectedIds, ...(input.allAddOnIds ?? [])])]
  const [availability, quote, ...addOnAvailabilities] = await Promise.all([
    checkAvailability(input.productId, startsAt, endsAt),
    quoteBooking(input.productId, startsAt, endsAt, {
      quantity: input.quantity ?? 1,
      addOnIds: selectedIds,
      deliveryFeeCents: input.deliveryFeeCents ?? 0,
    }),
    // Live stock per tracked add-on over the selected window (§2C).
    ...availabilityIds.map((id) => getAddOnAvailability(id, startsAt, endsAt)),
  ])

  const addOnAvailability: Record<string, number | null> = {}
  for (let i = 0; i < availabilityIds.length; i++) {
    addOnAvailability[availabilityIds[i]] = addOnAvailabilities[i]?.available ?? null
  }

  return {
    error: null,
    days: rentalDays(startsAt, endsAt),
    availability,
    quote,
    addOnAvailability,
  }
}