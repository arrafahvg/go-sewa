'use server'

import { checkAvailability, listFreeDeviceIds } from '@/lib/services/availability'
import { db } from '@/lib/db'
import { devices } from '@/lib/db/schema'
import { inArray } from 'drizzle-orm'

/**
 * Admin walk-in form helper: returns which exact physical units are free for the
 * chosen dates + the live availability count (reuses the public engine, §19B).
 */
export async function adminGetFreeDevices(input: { productId: string; startsAt: string; endsAt: string }) {
  const startsAt = new Date(input.startsAt)
  const endsAt = new Date(input.endsAt)
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    return { error: 'Invalid dates.', free: [], availability: null }
  }

  const freeIds = await listFreeDeviceIds(input.productId, startsAt, endsAt)
  const availability = await checkAvailability(input.productId, startsAt, endsAt)

  let free: { id: string; assetCode: string; condition: string }[] = []
  if (freeIds.length) {
    const rows = await db.select().from(devices).where(inArray(devices.id, freeIds))
    free = rows.map((d) => ({ id: d.id, assetCode: d.assetCode, condition: d.condition }))
  }

  return { error: null, free, availability }
}