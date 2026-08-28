import type { Metadata } from 'next'
import { listDevicesForAdmin } from '@/lib/services/inventory'
import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { inArray } from 'drizzle-orm'
import { toQrDataUrl } from '@/lib/utils/qr'

export const metadata: Metadata = {
  title: 'Device labels — Go-Sewa Admin',
}
export const dynamic = 'force-dynamic'

/**
 * Print-ready QR asset labels (§40). Each label encodes a web URL that resolves
 * to the device's record on scan (`/admin/devices/<assetCode>`). Manual search
 * in inventory remains available — QR is optional, never required.
 */
export default async function LabelsPage() {
  const devices = await listDevicesForAdmin()
  const deviceIds = [...new Set(devices.map((d) => d.productId))]
  const productNameById = new Map<string, string>()
  if (deviceIds.length) {
    const rows = await db.select({ id: products.id, name: products.name }).from(products).where(inArray(products.id, deviceIds))
    for (const r of rows) productNameById.set(r.id, r.name)
  }
  const origin =
    process.env.APP_URL?.replace(/\/$/, '') || 'https://go-sewa-tawny.vercel.app'
  const labels = await Promise.all(
    devices.map(async (d) => ({
      assetCode: d.assetCode,
      product: productNameById.get(d.productId) ?? '',
      qr: await toQrDataUrl(`${origin}/admin/devices/${encodeURIComponent(d.assetCode)}`),
    })),
  )

  return (
    <div className="p-6 text-[#173b3b]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Device QR labels</h1>
          <p className="text-xs text-[#173b3b]/55">Print this sheet and stick one label on each physical unit. Scan to open the device record instantly.</p>
        </div>
        <button onClick={() => window.print()} className="print:hidden rounded-full bg-[#173b3b] px-5 py-2.5 text-sm font-bold text-white">Print</button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {labels.map((l) => (
          <div key={l.assetCode} className="flex flex-col items-center rounded-xl border border-[#173b3b]/15 bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.qr} alt={`QR for ${l.assetCode}`} className="h-24 w-24" />
            <p className="mt-1 font-mono text-xs font-bold">{l.assetCode}</p>
            <p className="text-[10px] text-[#173b3b]/55">{l.product}</p>
          </div>
        ))}
      </div>
      {labels.length === 0 && (
        <p className="mt-10 text-center text-sm text-[#173b3b]/50">No devices registered yet — add units in Inventory first.</p>
      )}
    </div>
  )
}

