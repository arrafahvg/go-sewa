import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getDeviceByAssetCode } from '@/lib/services/devices'
import { db } from '@/lib/db'
import { bookings, products } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const metadata: Metadata = {
  title: 'Device — Go-Sewa Admin',
}
export const dynamic = 'force-dynamic'

/**
 * QR scan target (§40): `/admin/devices/<assetCode>` opens the exact physical
 * device record from a scanned label. Manual search in inventory still works.
 */
export default async function DeviceLookupPage({ params }: { params: Promise<{ assetCode: string }> }) {
  const { assetCode } = await params
  const device = await getDeviceByAssetCode(decodeURIComponent(assetCode))
  if (!device) notFound()

  const [productRows, bookingRows] = await Promise.all([
    db.select().from(products).where(eq(products.id, device.productId)),
    device.currentBookingId ? db.select().from(bookings).where(eq(bookings.id, device.currentBookingId)) : Promise.resolve([]),
  ])
  const product = productRows[0]
  const booking = bookingRows[0]

  const statusColor =
    device.status === 'available' ? 'bg-[#e4eee8] text-[#27604a]'
    : ['rented', 'reserved', 'overdue'].includes(device.status) ? 'bg-[#f0ecd0] text-[#7a6a2a]'
    : device.status === 'maintenance' || device.status === 'damaged' ? 'bg-[#f5d9d3] text-[#a43d2b]'
    : 'bg-[#e0e3e0] text-[#4d6b62]'

  const field = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between gap-6 border-b border-[#173b3b]/8 py-2 text-sm">
      <span className="text-[#173b3b]/55">{k}</span>
      <span className="text-right font-semibold">{v || '—'}</span>
    </div>
  )

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">
        <Link href="/admin/inventory" className="hover:underline">Inventory</Link> / Device
      </p>
      <div className="mt-2 rounded-2xl border border-[#173b3b]/10 bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-mono text-2xl font-bold">{device.assetCode}</h1>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusColor}`}>{device.status.replace(/_/g, ' ')}</span>
        </div>
        <p className="mt-1 text-sm text-[#173b3b]/60">{product?.name ?? '—'}</p>

        <div className="mt-4 rounded-xl border border-[#173b3b]/10 bg-[#faf8f2] p-4">
          {field('Product', product?.name)}
          {field('Serial number', device.serialNumber)}
          {field('IMEI', device.imei)}
          {field('Condition', device.condition)}
          {field('Storage', device.storage)}
          {field('Battery', device.batteryHealth != null ? `${device.batteryHealth}%` : null)}
          {field('Notes', device.notes)}
        </div>

        {booking ? (
          <Link
            href={`/admin/bookings/${booking.id}`}
            className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#173b3b] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
          >
            Open current booking {booking.number || ''} →
          </Link>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-[#173b3b]/15 bg-[#faf8f2] px-4 py-3 text-center text-xs text-[#173b3b]/55">
            No active booking assigned to this unit right now.
          </p>
        )}

        <div className="mt-4 flex justify-center gap-3">
          <Link href="/admin/inventory" className="rounded-full border border-[#173b3b]/15 px-4 py-2 text-xs font-bold hover:bg-[#e4eee8]">Back to inventory</Link>
          <Link href="/admin/labels" className="rounded-full border border-[#173b3b]/15 px-4 py-2 text-xs font-bold hover:bg-[#e4eee8]">Print labels</Link>
        </div>
      </div>
    </div>
  )
}
