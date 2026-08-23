import type { Metadata } from 'next'
import Link from 'next/link'
import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { bookings, customers } from '@/lib/db/schema'
import { getBookingsForCustomer } from '@/lib/services/customers'
import { formatMoney } from '@/lib/utils/money'

export const metadata: Metadata = {
  title: 'Go-Sewa Admin — Customers',
  description: 'Go-Sewa customer profiles and their rental history.',
}

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const customersList = await db.select().from(customers).orderBy(desc(customers.createdAt))
  const rows = await db.select({ customerId: bookings.customerId }).from(bookings)
  const counts = new Map<string, number>()
  for (const b of rows) counts.set(b.customerId, (counts.get(b.customerId) ?? 0) + 1)

  const withBookings = await Promise.all(
    customersList.map(async (c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      idVerified: c.idVerified,
      bookingCount: counts.get(c.id) ?? 0,
      bookings: await getBookingsForCustomer(c.id),
    })),
  )

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#173b3b]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45"><a href="/admin" className="hover:underline">Admin</a> / Customers</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-3xl tracking-tight">Customers</h1>
          <span className="rounded-full bg-[#e4eee8] px-2.5 py-1 text-[11px] font-bold text-[#387066]">{customersList.length} total</span>
        </div>

        <div className="mt-6 rounded-2xl border border-[#173b3b]/10 bg-white">
          {customersList.length === 0 && <p className="px-5 py-10 text-sm text-[#173b3b]/50">No customers yet.</p>}
          {withBookings.map((c) => (
            <div key={c.id} className="border-b border-[#173b3b]/8 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{c.name}</p>
                  <p className="text-xs text-[#173b3b]/55">{c.phone ?? 'No phone'}{c.phone && c.email ? ' · ' : ''}{c.email ?? ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  {c.idVerified && <span className="rounded-full bg-[#e4eee8] px-2.5 py-1 text-[11px] font-bold text-[#27604a]">ID verified</span>}
                  <span className="rounded-full bg-[#f1eee7] px-2.5 py-1 text-[11px] font-bold text-[#173b3b]/60">{c.bookingCount} booking(s)</span>
                </div>
              </div>
              {c.bookings.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-[#173b3b]/60">
                  {c.bookings.map((b) => (
                    <li key={b.id}>
                      <Link href={`/admin/bookings/${b.id}`} className="font-mono font-bold text-[#387066] hover:underline">{b.number}</Link>
                      {' '}· {new Date(b.startsAt).toLocaleDateString()} → {new Date(b.endsAt).toLocaleDateString()} · {b.items.map((i) => `${i.productName}×${i.qty}`).join(', ')} · {formatMoney(b.totalCents)} · {b.status.replace(/_/g, ' ')}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}