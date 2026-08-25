import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/services/auth'
import { getBookingsForCustomer, resolveCustomerForUser } from '@/lib/services/customers'
import { getDictionary, getLocale } from '@/lib/i18n'
import { formatMoney } from '@/lib/utils/money'

export const metadata: Metadata = {
  title: 'My bookings — Go-Sewa',
  description: 'Your Go-Sewa rental bookings.',
}

export const dynamic = 'force-dynamic'

function formatDate(d: Date | string, locale: string): string {
  return new Date(d).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_LABELS: Record<'id' | 'en', Record<string, string>> = {
  en: {
    pending: 'Pending confirmation',
    awaiting_confirmation: 'Awaiting confirmation',
    payment_pending: 'Payment pending',
    partially_paid: 'Partially paid',
    confirmed: 'Confirmed',
    paid: 'Paid',
    reserved: 'Reserved',
    ready_for_pickup: 'Ready for pickup',
    out_for_delivery: 'Out for delivery',
    active_rental: 'Active rental',
    return_due: 'Return due',
    overdue: 'Overdue',
    returned: 'Returned',
    inspection: 'Under inspection',
    completed: 'Completed',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
    draft: 'Draft',
  },
  id: {
    pending: 'Menunggu konfirmasi',
    awaiting_confirmation: 'Menunggu konfirmasi',
    payment_pending: 'Menunggu pembayaran',
    partially_paid: 'Sebagian dibayar',
    confirmed: 'Dikonfirmasi',
    paid: 'Lunas',
    reserved: 'Direservasi',
    ready_for_pickup: 'Siap diambil',
    out_for_delivery: 'Sedang diantar',
    active_rental: 'Sewa berlangsung',
    return_due: 'Jatuh tempo kembali',
    overdue: 'Terlambat',
    returned: 'Dikembalikan',
    inspection: 'Pemeriksaan',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
    refunded: 'Direfund',
    draft: 'Draft',
  },
}

export default async function MyBookingsPage() {
  const current = await getCurrentUser()
  if (!current) redirect('/sign-in')
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()])

  const customer = await resolveCustomerForUser({ id: current.id, email: current.email })
  const rows = customer ? await getBookingsForCustomer(customer.id) : []

  return (
    <div className="min-h-screen bg-[#f8f6f1] px-5 py-10 text-[#173b3b] lg:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">
          <Link href="/" className="hover:underline">{dict.bookings.breadcrumbHome}</Link> /{' '}
          <Link href="/account" className="hover:underline">{dict.bookings.breadcrumbAccount}</Link> / {dict.bookings.title}
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight">{dict.bookings.title}</h1>

        {rows.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[#173b3b]/25 bg-white p-10 text-center">
            <p className="font-bold">{dict.bookings.noBookingsYet}</p>
            <p className="mt-2 text-sm text-[#173b3b]/60">
              {dict.bookings.noBookingsBody}
            </p>
            <Link
              href="/rent"
              className="mt-5 inline-block rounded-full bg-[#173b3b] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#173b3b]/85"
            >
              {dict.bookings.browseGear}
            </Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {rows.map((b) => (
              <li key={b.id} className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-mono font-bold">{b.number}</p>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                      b.status === 'cancelled' || b.status === 'refunded'
                        ? 'bg-red-50 text-red-800'
                        : b.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-[#173b3b]/8 text-[#173b3b]'
                    }`}
                  >
                    {STATUS_LABELS[locale][b.status] ?? b.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#173b3b]/60">
                  {formatDate(b.startsAt, locale)} → {formatDate(b.endsAt, locale)} · {b.fulfillment === 'delivery' ? dict.bookings.delivery : dict.bookings.pickup}
                </p>
                <ul className="mt-3 space-y-1 text-sm">
                  {b.items.map((it, i) => (
                    <li key={i} className="flex justify-between gap-4">
                      <span>{it.productName} × {it.qty}</span>
                      <span className="text-[#173b3b]/70">{formatMoney(it.lineTotalCents)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex justify-between border-t border-[#173b3b]/10 pt-3 text-sm font-bold">
                  <span>{dict.bookings.rentalTotal}</span>
                  <span>{formatMoney(b.totalCents)}</span>
                </div>
                <p className="mt-1 text-xs text-[#173b3b]/50">
                  {dict.bookings.depositNote.replace('{amount}', formatMoney(b.depositCents))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}