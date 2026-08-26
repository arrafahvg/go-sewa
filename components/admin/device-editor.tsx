'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { saveDeviceAction } from '@/app/actions/inventory'
import type { AdminDevice } from '@/lib/data/admin'

const inputCls = 'mt-1 w-full rounded-lg border border-[#173b3b]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#387066]'
const CONDITIONS = ['excellent', 'good', 'fair', 'poor'] as const

type ProductOption = { id: string; name: string }

/**
 * Per-row editor for a registered physical unit (§56): identity (asset code,
 * serial, IMEIs), condition metadata and the Active (bookable) flag. Writes go
 * through the staff-gated, audit-logged saveDeviceAction; operational status
 * stays in the separate Set status control so transitions remain guarded (§4).
 */
export default function DeviceEditor({ device, products, onDone }: {
  device: AdminDevice
  products: ProductOption[]
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [productId, setProductId] = useState(device.productId)
  const [assetCode, setAssetCode] = useState(device.assetCode)
  const [condition, setCondition] = useState(device.condition)
  const [serialNumber, setSerialNumber] = useState(device.serialNumber ?? '')
  const [imei, setImei] = useState(device.imei ?? '')
  const [imei2, setImei2] = useState(device.imei2 ?? '')
  const [color, setColor] = useState(device.color ?? '')
  const [storage, setStorage] = useState(device.storage ?? '')
  const [batteryHealth, setBatteryHealth] = useState(device.batteryHealth != null ? String(device.batteryHealth) : '')
  const [notes, setNotes] = useState(device.notes ?? '')
  const [active, setActive] = useState(device.active)

  async function save() {
    setBusy(true); setError(null)
    const res = await saveDeviceAction({
      id: device.id,
      productId,
      assetCode,
      condition,
      serialNumber: serialNumber || undefined,
      imei: imei || undefined,
      imei2: imei2 || undefined,
      color: color || undefined,
      storage: storage || undefined,
      batteryHealth: batteryHealth === '' ? null : Number(batteryHealth),
      notes: notes || undefined,
      active,
    })
    setBusy(false)
    if (!res.ok) { setError(res.error); return }
    setOpen(false)
    onDone()
  }

  return (
    <>
      <button onClick={() => setOpen((v) => !v)} className="text-xs font-bold text-[#387066] hover:underline">{open ? 'Close' : 'Edit'}</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#173b3b]/40 p-4 sm:p-8" onClick={() => { if (!busy) setOpen(false) }}>
          <div className="w-full max-w-2xl rounded-2xl border border-[#173b3b]/10 bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-xl font-bold">Edit unit — {device.assetCode}</h3>
            <p className="mt-1 text-xs text-[#173b3b]/50">
              Identity, condition and bookability of this physical unit (§56). Operational status stays in the Set status control.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-[#173b3b]/60">Product
                <select value={productId} onChange={(e) => setProductId(e.target.value)} className={inputCls}>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label className="block text-xs font-bold text-[#173b3b]/60">Asset code<input value={assetCode} onChange={(e) => setAssetCode(e.target.value)} className={inputCls} /></label>
              <label className="block text-xs font-bold text-[#173b3b]/60">Condition
                <select value={condition} onChange={(e) => setCondition(e.target.value)} className={inputCls}>
                  {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="block text-xs font-bold text-[#173b3b]/60">Serial number<input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className={inputCls} /></label>
              <label className="block text-xs font-bold text-[#173b3b]/60">IMEI<input value={imei} onChange={(e) => setImei(e.target.value)} className={inputCls} /></label>
              <label className="block text-xs font-bold text-[#173b3b]/60">IMEI 2<input value={imei2} onChange={(e) => setImei2(e.target.value)} className={inputCls} /></label>
              <label className="block text-xs font-bold text-[#173b3b]/60">Color<input value={color} onChange={(e) => setColor(e.target.value)} className={inputCls} /></label>
              <label className="block text-xs font-bold text-[#173b3b]/60">Storage<input value={storage} onChange={(e) => setStorage(e.target.value)} className={inputCls} placeholder="128GB" /></label>
              <label className="block text-xs font-bold text-[#173b3b]/60">Battery health (%)<input type="number" min={0} max={100} value={batteryHealth} onChange={(e) => setBatteryHealth(e.target.value)} className={inputCls} /></label>
              <label className="block text-xs font-bold text-[#173b3b]/60">Notes<input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></label>
              <label className="flex items-center gap-2 self-end pb-2 text-xs font-bold text-[#173b3b]/60">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[#e76f51]" />
                Active (bookable)
              </label>
            </div>
            <div className="mt-4 space-y-2">
              {error && <p role="alert" className="text-sm font-bold text-[#a43d2b]">{error}</p>}
              <div className="flex gap-3">
                <button onClick={save} disabled={busy} className="flex items-center gap-2 rounded-full bg-[#173b3b] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
                  {busy && <Loader2 size={15} className="animate-spin" />} Save changes
                </button>
                <button onClick={() => setOpen(false)} disabled={busy} className="rounded-full border border-[#173b3b]/15 px-6 py-3 text-sm font-bold hover:bg-[#f1eee7]">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}