import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { eq, sql, desc } from 'drizzle-orm'
import { getBookingDetail } from '@/lib/services/operations'
import { listFreeDeviceIds } from '@/lib/services/availability'
import { getDeposit, getDepositHistory } from '@/lib/services/deposits'
import { getPaymentHistory } from '@/lib/services/payments'
import { db } from '@/lib/db'
import { devices, payments } from '@/lib/db/schema'
import { inArray } from 'drizzle-orm'
import BookingOps from '@/components/admin/booking-ops'
import GenerateInvoiceButton from '@/components/admin/generate-invoice-button'
import AgreementsPanel from '@/components/admin/agreements-panel'
import IdentityDocumentsPanel from '@/components/admin/identity-documents-panel'
import DepositPaymentPanel from '@/components/admin/deposit-payment-panel'
import { customerDocuments, depositTransactions } from '@/lib/db/schema'

export const metadata: Metadata = { title: 'Booking detail — Go-Sewa Admin' }
export const dynamic = 'force-dynamic'

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = await getBookingDetail(id)
  if (!detail) notFound()

  // Free physical units for this booking's product + dates (for device assignment, §22).
  const freeIds = await listFreeDeviceIds(
    detail.items[0]?.productId ?? '',
    detail.booking.startsAt,
    detail.booking.endsAt,
    detail.booking.id,
  )
  const freeDevices = freeIds.length
    ? await db.select().from(devices).where(inArray(devices.id, freeIds))
    : []

  // Identity documents (KTP / SIM collateral) attached to the booking's customer.
  const identityDocs = detail.customer
    ? await db.select().from(customerDocuments).where(eq(customerDocuments.customerId, detail.customer.id))
    : []

  // Deposit + payment state (financials are derived from history, spec §81).
  const deposit = await getDeposit(detail.booking.id)
  const depositHistory = deposit
    ? await db.select().from(depositTransactions).where(eq(depositTransactions.depositId, deposit.id)).orderBy(desc(depositTransactions.createdAt))
    : []
  const paymentHistory = await getPaymentHistory(detail.booking.id)
  const paidRow = await db
    .select({ sum: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int` })
    .from(payments).where(eq(payments.bookingId, detail.booking.id))
  const paidCents = Number(paidRow[0]?.sum ?? 0)

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#173b3b]">
      <header className="border-b border-[#173b3b]/10 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/admin" className="text-sm font-bold text-[#387066] hover:underline">← Admin</Link>
          <p className="font-serif text-xl font-bold">go<span className="text-[#e76f51]">—</span>sewa <span className="ml-1 text-sm font-normal text-[#173b3b]/50">/ booking</span></p>
        </div>
      </header>
      <nav className="mx-auto flex max-w-5xl flex-wrap gap-2 overflow-x-auto px-6 pt-4">
        <Link href="/admin/customers" className="rounded-full border border-[#173b3b]/15 px-4 py-2 text-xs font-bold hover:bg-[#e4eee8]">Customers</Link>
        <Link href="/admin/leads" className="rounded-full border border-[#173b3b]/15 px-4 py-2 text-xs font-bold hover:bg-[#e4eee8]">Leads</Link>
        <Link href="/admin/invoices" className="rounded-full border border-[#173b3b]/15 px-4 py-2 text-xs font-bold hover:bg-[#e4eee8]">Invoices</Link>
        <Link href="/admin/maintenance" className="rounded-full border border-[#173b3b]/15 px-4 py-2 text-xs font-bold hover:bg-[#e4eee8]">Maintenance</Link>
        <Link href="/admin/inventory" className="rounded-full border border-[#173b3b]/15 px-4 py-2 text-xs font-bold hover:bg-[#e4eee8]">Inventory</Link>
      </nav>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <BookingOps
          booking={{
            id: detail.booking.id,
            number: detail.booking.number,
            status: detail.booking.status,
            channel: detail.booking.channel,
            fulfillment: detail.booking.fulfillment,
            startsAt: detail.booking.startsAt.toISOString(),
            endsAt: detail.booking.endsAt.toISOString(),
            totalCents: detail.booking.totalCents,
            depositCents: detail.booking.depositCents,
            notes: detail.booking.notes,
          }}
          customer={detail.customer ? { name: detail.customer.name, phone: detail.customer.phone, email: detail.customer.email } : null}
          items={detail.items.map((i) => ({
            productName: i.productNameSnapshot ?? i.productId,
            quantity: i.quantity,
            unitPriceCents: i.unitPriceCents,
            lineTotalCents: i.lineTotalCents,
            priceRuleLabel: i.priceRuleLabel,
          }))}
          devices={detail.allocDevices.map(({ allocation, device }) => ({
            allocationId: allocation.id,
            deviceId: device?.id ?? '',
            assetCode: device?.assetCode ?? '—',
            deviceStatus: device?.status ?? 'unknown',
          }))}
          checkouts={detail.checkouts.map((c) => ({ condition: c.condition, at: c.checkedOutAt.toISOString() }))}
          checkins={detail.checkins.map((c) => ({ condition: c.condition, damageNoted: c.damageNoted, at: c.checkedInAt.toISOString() }))}
          freeDevices={freeDevices.map((d) => ({ id: d.id, assetCode: d.assetCode }))}
        />

        <div className="mt-8 grid gap-4 print:hidden">
          <IdentityDocumentsPanel
            docs={identityDocs.map((d) => ({
              id: d.id, kind: d.kind, createdAt: d.createdAt.toISOString(),
              verified: detail.customer?.idVerified ?? false,
              customerId: d.customerId,
            }))}
          />
          <DepositPaymentPanel
            bookingId={detail.booking.id}
            number={detail.booking.number}
            totalCents={detail.booking.totalCents}
            depositCents={detail.booking.depositCents}
            depositStatus={deposit?.status ?? null}
            depositHistory={depositHistory.map((t) => ({
              id: t.id, kind: t.kind, amountCents: t.amountCents, note: t.note, createdAt: t.createdAt.toISOString(),
            }))}
            payments={paymentHistory.map((p) => ({
              id: p.id, method: p.method, amountCents: p.amountCents, reference: p.reference, receivedAt: p.receivedAt?.toISOString() ?? new Date().toISOString(),
            }))}
            paidCents={paidCents}
          />
          <AgreementsPanel bookingId={detail.booking.id} />
          <GenerateInvoiceButton bookingId={detail.booking.id} />
        </div>
      </main>
    </div>
  )
}