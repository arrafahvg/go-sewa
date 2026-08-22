'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { formatMoney } from '@/lib/utils/money'
import {
  checkOutDeviceAction, checkInDeviceAction,
  inspectDeviceAction, assignDevicesAction, updateBookingStatusAction,
} from '@/app/actions/operations'

type Booking = {
  id: string; number: string; status: string; channel: string; fulfillment: string
  startsAt: string; endsAt: string; totalCents: number; depositCents: number; notes: string | null
}
type Device = { allocationId: string; deviceId: string; assetCode: string; deviceStatus: string }

const NEXT_STATUS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  awaiting_confirmation: ['confirmed', 'cancelled'],
  confirmed: ['ready_for_pickup', 'active_rental', 'cancelled'],
  payment_pending: ['paid'],
  partially_paid: ['paid'],
  paid: ['ready_for_pickup'],
  reserved: ['ready_for_pickup', 'active_rental'],
  ready_for_pickup: ['active_rental'],
  active_rental: ['return_due', 'overdue'],
  returned: ['completed'],
}

export default function BookingOps({
  booking, customer, items, devices: allocated, checkouts, checkins, freeDevices,
}: {
  booking: Booking
  customer: { name: string; phone: string | null; email: string | null } | null
  items: { productName: string; quantity: number; unitPriceCents: number; lineTotalCents: number; priceRuleLabel: string | null }[]
  devices: Device[]
  checkouts: { condition: string; at: string }[]
  checkins: { condition: string; damageNoted: boolean; at: string }[]
  freeDevices: { id: string; assetCode: string }[]
}) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState(booking.status)
  const [deviceList, setDeviceList] = useState(allocated)
  const [selectedFree, setSelectedFree] = useState<string[]>([])

  const run = async (key: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(key); setError('')
    const res = await fn()
    setBusy('')
    if (!res.ok) setError(res.error ?? 'Operation failed.')
    return res.ok
  }

  const canCheckOut = ['confirmed', 'reserved', 'ready_for_pickup', 'paid'].includes(status)
  const canCheckIn = ['active_rental', 'overdue', 'return_due'].includes(status)
  const canInspect = deviceList.some((d) => d.deviceStatus === 'inspection')

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-sm text-[#173b3b]/55">{booking.number}</p>
        <h1 className="mt-1 flex items-center gap-3 font-serif text-3xl tracking-tight">
          Booking detail
          <span className="rounded-full bg-[#e4eee8] px-3 py-1 text-xs font-bold text-[#27604a]">{status.replace(/_/g, ' ')}</span>
        </h1>
        {error && <p className="mt-2 text-sm font-bold text-[#a43d2b]">{error}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/50">Customer</h2>
          <p className="mt-2 font-bold">{customer?.name ?? '—'}</p>
          <p className="text-xs text-[#173b3b]/55">{customer?.phone ?? ''}{customer?.email ? ` · ${customer.email}` : ''}</p>
          <p className="mt-2 text-xs text-[#173b3b]/55">Channel: {booking.channel} · {booking.fulfillment}</p>
        </div>
        <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/50">Rental</h2>
          <p className="mt-2 text-sm">{new Date(booking.startsAt).toLocaleDateString()} → {new Date(booking.endsAt).toLocaleDateString()}</p>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-[#173b3b]/60">Rental fee</span><strong>{formatMoney(booking.totalCents)}</strong></div>
            <div className="flex justify-between"><span className="text-[#173b3b]/60">Deposit</span><strong>{formatMoney(booking.depositCents)}</strong></div>
            <div className="flex justify-between border-t border-[#173b3b]/10 pt-1"><span className="font-bold">Total due</span><span className="font-bold">{formatMoney(booking.totalCents + booking.depositCents)}</span></div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/50">Items & assigned devices</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {items.map((i, idx) => (
            <li key={idx} className="flex justify-between border-b border-[#173b3b]/8 pb-2 last:border-0 last:pb-0">
              <span>{i.productName} × {i.quantity} <span className="text-xs text-[#173b3b]/45">({i.priceRuleLabel})</span></span>
              <strong>{formatMoney(i.lineTotalCents)}</strong>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-2">
          {deviceList.length === 0 && <p className="text-sm font-bold text-[#a43d2b]">No physical device assigned yet — assign one below.</p>}
          {deviceList.map((d) => (
            <div key={d.allocationId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f7f5ef] p-3">
              <div>
                <p className="font-mono text-sm font-bold">{d.assetCode}</p>
                <p className="text-xs text-[#173b3b]/55">device status: {d.deviceStatus}</p>
              </div>
              <div className="flex gap-2">
                {canCheckOut && d.deviceStatus === 'reserved' && (
                  <button onClick={() => run(`co-${d.deviceId}`, () => checkOutDeviceAction({ bookingId: booking.id, deviceId: d.deviceId }))} disabled={busy !== ''} className="flex items-center gap-1 rounded-full bg-[#173b3b] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                    {busy === `co-${d.deviceId}` && <Loader2 size={13} className="animate-spin" />} Check out
                  </button>
                )}
                {canCheckIn && d.deviceStatus === 'rented' && (
                  <button onClick={() => run(`ci-${d.deviceId}`, () => checkInDeviceAction({ bookingId: booking.id, deviceId: d.deviceId }))} disabled={busy !== ''} className="flex items-center gap-1 rounded-full bg-[#387066] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                    {busy === `ci-${d.deviceId}` && <Loader2 size={13} className="animate-spin" />} Check in
                  </button>
                )}
                {d.deviceStatus === 'inspection' && (
                  <>
                    <button onClick={() => run(`ip-${d.deviceId}`, () => inspectDeviceAction({ deviceId: d.deviceId, bookingId: booking.id, passed: true }))} disabled={busy !== ''} className="rounded-full bg-[#27604a] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Pass</button>
                    <button onClick={() => run(`if-${d.deviceId}`, () => inspectDeviceAction({ deviceId: d.deviceId, bookingId: booking.id, passed: false, notes: 'Failed inspection.' }))} disabled={busy !== ''} className="rounded-full bg-[#a43d2b] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Fail</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {freeDevices.length > 0 && (
          <div className="mt-4 rounded-xl border border-dashed border-[#173b3b]/15 p-3">
            <p className="text-xs font-bold text-[#173b3b]/60">Assign free units for these dates</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {freeDevices.map((d) => (
                <button key={d.id} onClick={() => setSelectedFree((prev) => prev.includes(d.id) ? prev.filter((x) => x !== d.id) : [...prev, d.id])} className={`rounded-lg border px-3 py-1.5 font-mono text-xs font-bold ${selectedFree.includes(d.id) ? 'border-[#173b3b] bg-[#173b3b] text-white' : 'border-[#173b3b]/15 bg-[#f7f5ef]'}`}>
                  {d.assetCode}
                </button>
              ))}
            </div>
            {selectedFree.length > 0 && (
              <button onClick={() => run('assign', async () => {
                const r = await assignDevicesAction({ bookingId: booking.id, deviceIds: selectedFree })
                if (r.ok) {
                  setDeviceList((prev) => [...prev, ...freeDevices.filter((f) => selectedFree.includes(f.id)).map((f) => ({ allocationId: `new-${f.id}`, deviceId: f.id, assetCode: f.assetCode, deviceStatus: 'reserved' }))])
                  setSelectedFree([])
                }
                return r
              })} disabled={busy !== ''} className="mt-3 rounded-full bg-[#e76f51] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                {busy === 'assign' && <Loader2 size={13} className="inline animate-spin" />} Assign selected
              </button>
            )}
          </div>
        )}
      </div>

      {(checkouts.length > 0 || checkins.length > 0) && (
        <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/50">Handover history</h2>
          <ul className="mt-3 space-y-1 text-sm text-[#173b3b]/70">
            {checkouts.map((c, i) => <li key={`co${i}`}>✅ Checked out · condition {c.condition} · {new Date(c.at).toLocaleString()}</li>)}
            {checkins.map((c, i) => <li key={`ci${i}`}>↩️ Checked in · condition {c.condition}{c.damageNoted ? ' · damage noted' : ''} · {new Date(c.at).toLocaleString()}</li>)}
          </ul>
        </div>
      )}

      {(NEXT_STATUS[status]?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/50">Move status</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {NEXT_STATUS[status].map((s) => (
              <button key={s} onClick={() => run(`st-${s}`, async () => {
                const r = await updateBookingStatusAction({ bookingId: booking.id, status: s })
                if (r.ok) setStatus(s)
                return r
              })} disabled={busy !== ''} className="rounded-full border border-[#173b3b]/15 px-4 py-2 text-xs font-bold hover:bg-[#e4eee8] disabled:opacity-50">
                {busy === `st-${s}` && <Loader2 size={13} className="inline animate-spin" />} → {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {!canCheckOut && !canCheckIn && !canInspect && (NEXT_STATUS[status]?.length ?? 0) === 0 && (
        <p className="flex items-center gap-2 text-sm text-[#173b3b]/55"><Check size={15} /> No handover actions available in status “{status}”.</p>
      )}
    </div>
  )
}