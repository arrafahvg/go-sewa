import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getBookingDetail } from '@/lib/services/operations'
import { listFreeDeviceIds } from '@/lib/services/availability'
import { db } from '@/lib/db'
import { devices } from '@/lib/db/schema'
import { inArray } from 'drizzle-orm'
import BookingOps from '@/components/admin/booking-ops'
import GenerateInvoiceButton from '@/components/admin/generate-invoice-button'
import AgreementsPanel from '@/components/admin/agreements-panel'
import IdentityDocumentsPanel from '@/components/admin/identity-documents-panel'
import { customerDocuments } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

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

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#173b3b]">
      <header className="border-b border-[#173b3b]/10 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/admin" className="text-sm font-bold text-[#387066] hover:underline">← Admin</Link>
          <p className="font-serif text-xl font-bold">go<span className="text-[#e76f51]">—</span>sewa <span className="ml-1 text-sm font-normal text-[#173b3b]/50">/ booking</span></p>
        </div>
      </header>
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
          <AgreementsPanel bookingId={detail.booking.id} />
          <GenerateInvoiceButton bookingId={detail.booking.id} />
        </div>
      </main>
    </div>
  )
}