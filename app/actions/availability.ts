'use server'

import { checkAvailability } from '@/lib/services/availability'
import { quoteBooking } from '@/lib/services/pricing'
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

  const [availability, quote] = await Promise.all([
    checkAvailability(input.productId, startsAt, endsAt),
    quoteBooking(input.productId, startsAt, endsAt, {
      quantity: input.quantity ?? 1,
      addOnIds: input.addOnIds ?? [],
      deliveryFeeCents: input.deliveryFeeCents ?? 0,
    }),
  ])

  return {
    error: null,
    days: rentalDays(startsAt, endsAt),
    availability,
    quote,
  }
}