import { and, eq, inArray, isNull, lt, gt } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  devices, bookings, bookingDeviceAllocations, availabilityBlocks,
} from '@/lib/db/schema'
import { getSettingInt } from './settings'

// Booking statuses that hold a device / reserve stock.
const BLOCKING_BOOKING_STATUSES = [
  'draft', 'pending', 'awaiting_confirmation', 'confirmed', 'payment_pending',
  'partially_paid', 'paid', 'reserved', 'ready_for_pickup', 'out_for_delivery',
  'active_rental', 'return_due', 'overdue', 'returned', 'inspection',
]

// Device statuses that make a physical unit unbookable regardless of dates.
const UNBOOKABLE_DEVICE_STATUSES = ['maintenance', 'damaged', 'lost', 'retired', 'blocked'] as const

export type AvailabilityResult = {
  productId: string
  startsAt: Date
  endsAt: Date
  total: number
  available: number
  bookedDevices: string[]
  unbookableIds: string[]
  unavailable: boolean
}

/**
 * Core availability check for a product over a date range.
 * Serves both the public storefront and the admin walk-in flow so the two
 * paths can never disagree (spec §6 / §19B).
 *
 * @param productId        The product to check.
 * @param startsAt         Rental start (inclusive).
 * @param endsAt           Rental end (exclusive — the unit can go out again after).
 * @param excludeBookingId When checking an existing booking (extensions), ignore its own allocations.
 */
export async function checkAvailability(
  productId: string,
  startsAt: Date,
  endsAt: Date,
  excludeBookingId?: string,
): Promise<AvailabilityResult> {
  const turnaroundHours = await getSettingInt('turnaround_hours', 4)
  const bufferMs = turnaroundHours * 3_600_000

  const allDevices = await db.select().from(devices).where(
    and(eq(devices.productId, productId), eq(devices.active, true)),
  )

  if (allDevices.length === 0) {
    return {
      productId, startsAt, endsAt, total: 0, available: 0, bookedDevices: [],
      unbookableIds: [], unavailable: true,
    }
  }

  // Devices that are permanently/currently unbookable by status.
  const unbookableIds = allDevices
    .filter((d) => (UNBOOKABLE_DEVICE_STATUSES as readonly string[]).includes(d.status))
    .map((d) => d.id)

  // Manual availability blocks that intersect the range.
  const blocks = await db.select().from(availabilityBlocks).where(
    and(lt(availabilityBlocks.startsOn, endsAt), gt(availabilityBlocks.endsOn, startsAt)),
  )
  const blockedDeviceIds = new Set(blocks.map((b) => b.deviceId))

  // Bookings that overlap the range and are in a status that reserves stock.
  const overlappingBookings = await db.select().from(bookings).where(
    and(
      lt(bookings.startsAt, endsAt),
      gt(bookings.endsAt, startsAt),
    ),
  )
  const relevantBookingIds = overlappingBookings
    .filter((b) => BLOCKING_BOOKING_STATUSES.includes(b.status))
    .filter((b) => !excludeBookingId || b.id !== excludeBookingId)
    .map((b) => b.id)

  const bookedDeviceIds = new Set<string>()
  if (relevantBookingIds.length > 0) {
    const allocations = await db.select().from(bookingDeviceAllocations).where(
      and(
        inArray(bookingDeviceAllocations.bookingId, relevantBookingIds),
        isNull(bookingDeviceAllocations.releasedAt),
      ),
    )
    for (const a of allocations) bookedDeviceIds.add(a.deviceId)
  }

  // A device must be physically unbookable, blocked, or already reserved for the range.
  const unavailableDeviceIds = new Set<string>([...unbookableIds, ...blockedDeviceIds, ...bookedDeviceIds])
  const available = allDevices.filter((d) => !unavailableDeviceIds.has(d.id))

  return {
    productId,
    startsAt,
    endsAt,
    total: allDevices.length,
    available: available.length,
    bookedDevices: [...bookedDeviceIds],
    unbookableIds,
    unavailable: available.length === 0,
  }
}

/**
 * Returns the concrete physical device ids that are free for the range.
 * This is what both public checkout and the admin walk-in form call before
 * choosing which exact assets to assign (spec §19B step 2).
 */
export async function listFreeDeviceIds(
  productId: string,
  startsAt: Date,
  endsAt: Date,
  excludeBookingId?: string,
): Promise<string[]> {
  const allDevices = await db.select().from(devices).where(
    and(eq(devices.productId, productId), eq(devices.active, true)),
  )
  const blockedSet = new Set(
    (await db.select().from(availabilityBlocks).where(
      and(lt(availabilityBlocks.startsOn, endsAt), gt(availabilityBlocks.endsOn, startsAt)),
    )).map((b) => b.deviceId),
  )
  const result = await checkAvailability(productId, startsAt, endsAt, excludeBookingId)
  const unbookableSet = new Set(result.unbookableIds)
  const bookedSet = new Set(result.bookedDevices)
  return allDevices
    .filter((d) => !unbookableSet.has(d.id))
    .filter((d) => !blockedSet.has(d.id))
    .filter((d) => !bookedSet.has(d.id))
    .map((d) => d.id)
}