import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCustomerDetail, getCustomerTimeline } from '@/lib/services/customers'
import { formatMoney } from '@/lib/utils/money'
import CustomerProfileCard from '@/components/admin/customer-profile-card'
import CustomerTimeline from '@/components/admin/customer-timeline'
import IdentityDocumentsPanel from '@/components/admin/identity-documents-panel'

/**
 * Customer detail view (spec §31B). Everything shown comes from the DB (§81):
 * profile, lifetime stats, identity documents (private signed URLs), and the
 * full booking history with deep links to bookings, invoices and agreements.
 */
export const metadata: Metadata = {
  title: 'Go-Sewa Admin — Customer detail',
  description: 'Customer profile, documents, invoices, agreements and rental history.',
}

export const dynamic = 'force-dynamic'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [detail, timeline] = await Promise.all([getCustomerDetail(id), getCustomerTimeline(id)])
  if (!detail) notFound()

  const { customer, documents, tags, bookings, stats } = detail
  // kind is stored as `identity:<type>:<number>` by the upload service.
  const idDocs = documents.map((d) => ({
    id: d.id, kind: d.kind, createdAt: d.createdAt.toISOString(),
    verified: customer.idVerified, customerId: customer.id,
  }))

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#173b3b]">
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">

        <CustomerProfileCard
          customer={{
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            address: customer.address,
            notes: customer.notes,
            idVerified: customer.idVerified,
            idType: customer.idType,
            idNumber: customer.idNumber,
            createdAt: customer.createdAt.toISOString(),
          }}
          stats={{
            totalBookings: stats.totalBookings,
            totalSpentCents: stats.totalSpentCents,
            activeBookings: stats.activeBookings,
            lastRentalAt: stats.lastRentalAt ? stats.lastRentalAt.toISOString() : null,
          }}
          tags={tags.map((t) => t.tag)}
        />

        {documents.length > 0 && <IdentityDocumentsPanel docs={idDocs} />}

        {/* Activity timeline (spec §32) */}
        <CustomerTimeline events={timeline.events} />

        {/* Rental history with invoice/agreement links (§31B, §34) */}
        <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
          <h2 className="font-bold">Rental history</h2>
          {bookings.length === 0 ? (
            <p className="mt-3 text-sm text-[#173b3b]/50">No bookings yet for this customer.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {bookings.map((b) => {
                const inv = detail.invoicesByBooking.get(b.id)
                const agr = detail.agreementsByBooking.get(b.id)
                return (
                  <li key={b.id} className="rounded-xl bg-[#f7f5ef] px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/admin/bookings/${b.id}`} className="font-mono font-bold text-[#387066] hover:underline">{b.number}</Link>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#173b3b]/60">{b.status.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#173b3b]/60">
                      {new Date(b.startsAt).toLocaleDateString()} → {new Date(b.endsAt).toLocaleDateString()} ·{' '}
                      {b.items.map((i) => `${i.productName}×${i.qty}`).join(', ')} · <span className="font-bold text-[#173b3b]">{formatMoney(b.totalCents)}</span>
                    </p>
                    {(inv || agr) && (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                        {inv && (
                          <Link href={`/admin/invoices/${inv.id}`} className="rounded-full border border-[#173b3b]/15 px-3 py-1 hover:bg-[#e4eee8]">
                            Invoice {inv.number} · {inv.status.replace(/_/g, ' ')} · {formatMoney(inv.totalCents)}
                          </Link>
                        )}
                        {agr && (
                          <Link href={`/admin/agreements/${agr.id}`} className="rounded-full border border-[#173b3b]/15 px-3 py-1 hover:bg-[#e4eee8]">
                            Agreement {agr.number} · {agr.status}
                          </Link>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {documents.length === 0 && (
          <p className="text-sm text-[#173b3b]/50">
            No ID document on file yet. Documents uploaded at checkout or via the walk-in form appear here.
          </p>
        )}
      </div>
    </div>
  )
}