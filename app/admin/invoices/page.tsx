import type { Metadata } from 'next'
import Link from 'next/link'
import { listInvoices } from '@/lib/services/invoices'
import { getCustomers } from '@/lib/data/admin'
import { formatMoney } from '@/lib/utils/money'
import { db } from '@/lib/db'
import { bookings } from '@/lib/db/schema'
import ManualInvoicePanel from '@/components/admin/manual-invoice-panel'

export const metadata: Metadata = { title: 'Invoices — Go-Sewa Admin' }
export const dynamic = 'force-dynamic'

const STATUS_TONE: Record<string, string> = {
  paid: 'bg-[#e4eee8] text-[#27604a]',
  unpaid: 'bg-[#f0ecd0] text-[#7a6a2a]',
  pending: 'bg-[#f0ecd0] text-[#7a6a2a]',
  partially_paid: 'bg-[#f0ecd0] text-[#7a6a2a]',
  void: 'bg-[#f5d9d3] text-[#a43d2b]',
}

export default async function InvoicesPage() {
  const rows = await listInvoices()
  const customers = await getCustomers()
  const bookingRows = rows.some((r) => r.bookingId)
    ? await db.select({ id: bookings.id, number: bookings.number }).from(bookings)
    : []
  const bookingNumber = new Map(bookingRows.map((b) => [b.id, b.number]))

  return (
    <div className="min-h-screen bg-[#f4f1ea] px-4 py-8 text-[#173b3b] sm:px-6 xl:px-10">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">
          <Link href="/admin" className="hover:underline">Admin</Link> / Invoices
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-3xl tracking-tight">Invoices</h1>
          <ManualInvoicePanel customers={customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))} />
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-[#173b3b]/10 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#f1eee7] text-xs text-[#173b3b]/50">
              <tr>{['Invoice', 'Booking', 'Total', 'Status', 'Issued', 'Due', ''].map((h, i) => <th key={i} className="px-5 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-[#173b3b]/50">No invoices yet — generate one from a booking, or create a manual invoice above.</td></tr>
              )}
              {rows.map((inv) => (
                <tr key={inv.id} className="border-t border-[#173b3b]/8 transition hover:bg-[#faf8f2]">
                  <td className="px-5 py-4 font-mono text-xs font-bold">
                    <Link href={`/admin/invoices/${inv.id}`} className="text-[#387066] underline-offset-2 hover:underline">{inv.number}</Link>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs">{inv.bookingId ? bookingNumber.get(inv.bookingId) ?? '—' : '—'}</td>
                  <td className="px-5 py-4 font-bold">{formatMoney(inv.totalCents)}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_TONE[inv.status] ?? 'bg-[#e0e3e0] text-[#4d6b62]'}`}>{inv.status.replace(/_/g, ' ')}</span></td>
                  <td className="px-5 py-4 text-xs text-[#173b3b]/55">{inv.issuedAt.toLocaleDateString()}</td>
                  <td className="px-5 py-4 text-xs text-[#173b3b]/55">{inv.dueAt ? inv.dueAt.toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/admin/invoices/${inv.id}`} className="rounded-full border border-[#173b3b]/15 px-3 py-1.5 text-xs font-bold hover:bg-[#e4eee8]">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
