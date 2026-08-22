import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { bookings, customers, bookingItems, bookingDeviceAllocations } from '@/lib/db/schema'
import { getCatalogProducts } from '@/lib/data/catalog'

export async function getBookingsWithDetail() {
  const rows = await db.select().from(bookings).orderBy(desc(bookings.createdAt)).limit(100)

  const custIds = [...new Set(rows.map((r) => r.customerId))]
  const customersMap = new Map<string, { name: string; phone: string | null }>()
  if (custIds.length) {
    const custs = await db.select().from(customers)
    for (const c of custs) customersMap.set(c.id, { name: c.name, phone: c.phone })
  }

  const itemsMap = new Map<string, { productName: string; qty: number; total: number }>()
  const items = await db.select().from(bookingItems)
  for (const i of items) {
    itemsMap.set(i.bookingId, { productName: i.productNameSnapshot ?? i.productId, qty: i.quantity, total: i.lineTotalCents })
  }

  const allocMap = new Map<string, number>()
  const allocs = await db.select().from(bookingDeviceAllocations)
  for (const a of allocs) allocMap.set(a.bookingId, (allocMap.get(a.bookingId) ?? 0) + 1)

  return rows.map((b) => {
    const c = customersMap.get(b.customerId)
    return {
      ...b,
      customerName: c?.name ?? 'Unknown',
      customerPhone: c?.phone ?? null,
      productName: itemsMap.get(b.id)?.productName ?? '—',
      quantity: itemsMap.get(b.id)?.qty ?? 1,
      lineTotal: itemsMap.get(b.id)?.total ?? b.totalCents,
      deviceCount: allocMap.get(b.id) ?? 0,
    }
  })
}

export type BookingRow = Awaited<ReturnType<typeof getBookingsWithDetail>>[number]

export async function getCustomers() {
  return db.select().from(customers).orderBy(desc(customers.createdAt))
}

export { getCatalogProducts }