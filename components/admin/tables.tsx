'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { formatMoney } from '@/lib/utils/money'
import type { BookingRow } from '@/lib/data/admin'
import { adminGetFreeDevices } from '@/app/actions/admin'
import { submitAdminBooking } from '@/app/actions/bookings'
import IdentityDocumentUpload from '@/components/identity-document-upload'
import { todayStr, addDaysStr } from '@/lib/cart'

type Bookings = BookingRow[]
type Product = { id: string; slug: string; name: string; depositCents: number; dailyCents: number }
type Customer = { id: string; name: string; phone: string | null }

function StatusBadge({ status }: { status: string }) {
  const tone = ['completed', 'paid'].includes(status) ? 'bg-[#e0e3e0] text-[#4d6b62]'
    : ['active_rental', 'confirmed'].includes(status) ? 'bg-[#e4eee8] text-[#27604a]'
    : ['overdue', 'cancelled', 'damaged'].includes(status) ? 'bg-[#f5d9d3] text-[#a43d2b]'
    : 'bg-[#f0ecd0] text-[#7a6a2a]'
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}>{status.replace(/_/g, ' ')}</span>
}

export function BookingsTable({ bookings }: { bookings: Bookings }) {
  return (
    <div>
      <h1 className="font-serif text-3xl tracking-tight">Bookings</h1>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-[#173b3b]/10 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-[#f1eee7] text-xs text-[#173b3b]/50">
            <tr>{['Number', 'Customer', 'Product', 'Dates', 'Total', 'Status', 'Devices'].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {bookings.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-[#173b3b]/50">No bookings yet.</td></tr>}
            {bookings.map((b) => (
              <tr key={b.id} className="border-t border-[#173b3b]/8 transition hover:bg-[#faf8f2]">
                <td className="px-5 py-4 font-mono text-xs">
                  <Link href={`/admin/bookings/${b.id}`} className="font-bold text-[#387066] underline-offset-2 hover:underline">{b.number}</Link>
                </td>
                <td className="px-5 py-4"><p className="font-bold">{b.customerName}</p><p className="text-xs text-[#173b3b]/45">{b.customerPhone}</p></td>
                <td className="px-5 py-4">{b.productName} × {b.quantity}</td>
                <td className="px-5 py-4 text-xs text-[#173b3b]/55">{b.startsAt.toLocaleDateString()} → {b.endsAt.toLocaleDateString()}</td>
                <td className="px-5 py-4 font-bold">{formatMoney(b.lineTotal)}</td>
                <td className="px-5 py-4"><StatusBadge status={b.status} /></td>
                <td className="px-5 py-4">{b.deviceCount} device(s)</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function CustomersTable({ customers }: { customers: Customer[] }) {
  return (
    <div>
      <h1 className="font-serif text-3xl tracking-tight">Customers</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {customers.length === 0 && <p className="text-sm text-[#173b3b]/50">No customers yet.</p>}
        {customers.map((c) => (
          <div key={c.id} className="rounded-2xl border border-[#173b3b]/10 bg-white p-5">
            <p className="font-bold">{c.name}</p>
            <p className="mt-1 text-xs text-[#173b3b]/55">{c.phone ?? 'No phone'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

type FreeDevice = { id: string; assetCode: string; condition: string }

export function NewRentalForm({ products, customers }: { products: Product[]; customers: Customer[] }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [productId, setProductId] = useState('')
  const [start, setStart] = useState(todayStr())
  const [end, setEnd] = useState(addDaysStr(3))
  const [quantity, setQuantity] = useState(1)
  const [channel, setChannel] = useState<'in_store' | 'phone' | 'whatsapp'>('in_store')
  const [free, setFree] = useState<FreeDevice[]>([])
  const [availability, setAvailability] = useState<{ available: number; unavailable: boolean } | null>(null)
  const [checking, setChecking] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [identityDoc, setIdentityDoc] = useState<{ documentId: string; customerId: string } | null>(null)

  const check = async () => {
    if (!productId || start >= end) { setError('Choose a product and valid dates.'); return }
    setChecking(true); setError('')
    const res = await adminGetFreeDevices({ productId, startsAt: start, endsAt: end })
    setChecking(false)
    if (res.error) { setError(res.error); setFree([]); setAvailability(null); return }
    setFree(res.free)
    setAvailability(res.availability ? { available: res.availability.available, unavailable: res.availability.unavailable } : null)
    setSelected([])
  }

  const toggleDevice = (id: string) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const submit = async () => {
    if (!name.trim() || !productId) { setError('Enter the customer name and choose a product.'); return }
    if (!identityDoc) { setError("Upload the customer's KTP or SIM photo — required as collateral."); return }
    setBusy(true); setError('')
    const chosen = selected.length ? selected : free.slice(0, quantity).map((d) => d.id)
    const result = await submitAdminBooking({
      customerName: name.trim(), customerPhone: phone.trim(), productId,
      startsAt: start, endsAt: end, quantity, preferredDeviceIds: chosen,
      channel, notes: `Walk-in created on ${todayStr()}`,
      identityDocumentId: identityDoc.documentId,
      customerId: identityDoc.customerId,
    })
    setBusy(false)
    if (result.ok) {
      setSuccess(`Booking ${result.number} created (${channel}).`)
      setSelected([]); setFree([]); setAvailability(null)
    } else {
      setError(result.error)
    }
  }

  const inputCls = 'mt-2 w-full rounded-xl border border-[#173b3b]/12 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#e76f51]'

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-3xl tracking-tight">New rental</h1>
      <p className="mt-1 text-sm text-[#173b3b]/55">Walk-in / phone booking, validated against the same availability engine as the storefront.</p>
      {success && <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#8bc0a8] bg-[#e4eee8] px-4 py-3 text-sm font-bold text-[#27604a]"><Check size={16} /> {success}</div>}

      <div className="mt-6 space-y-4 rounded-2xl border border-[#173b3b]/10 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* §19B step 1: create a new customer inline OR pick an existing one.
              A free-text input (with a searchable datalist of existing customers) lets staff
              type a brand-new name; the booking service reuses by phone/name or creates on the fly. */}
          <label className="block text-xs font-bold text-[#173b3b]/60">Customer name
            <input list="admin-customer-names" value={name} onChange={(e) => setName(e.target.value)}
              className={inputCls} placeholder="Type a new name or pick an existing customer" required />
          </label>
          <datalist id="admin-customer-names">
            {customers.map((c) => <option key={c.id} value={c.name}>{c.phone ? ` · ${c.phone}` : ''}</option>)}
          </datalist>
          <label className="block text-xs font-bold text-[#173b3b]/60">WhatsApp number
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+62 812 ..." />
          </label>
        </div>

        <label className="block text-xs font-bold text-[#173b3b]/60">Product
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className={inputCls}>
            <option value="">— Select product —</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatMoney(p.dailyCents)}/day · dep {formatMoney(p.depositCents)}</option>)}
          </select>
        </label>

        <div className="border-t border-[#173b3b]/10 pt-4">
          <IdentityDocumentUpload customerName={name} customerPhone={phone} onUploaded={setIdentityDoc} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-xs font-bold text-[#173b3b]/60">Start
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
          </label>
          <label className="block text-xs font-bold text-[#173b3b]/60">Return
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
          </label>
          <label className="block text-xs font-bold text-[#173b3b]/60">Qty
            <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} className={inputCls} />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {([['in_store', 'In-store'], ['phone', 'Phone'], ['whatsapp', 'WhatsApp']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setChannel(k)} className={`rounded-full px-4 py-2 text-xs font-bold ${channel === k ? 'bg-[#173b3b] text-white' : 'bg-[#f1eee7] text-[#173b3b]/70'}`}>{label}</button>
          ))}
        </div>

        <button onClick={check} disabled={checking} className="flex items-center gap-2 rounded-full bg-[#173b3b] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
          {checking && <Loader2 size={15} className="animate-spin" />} Check availability
        </button>

        {availability && (
          <p className={`text-sm font-bold ${availability.unavailable ? 'text-[#a43d2b]' : 'text-[#27604a]'}`}>
            {availability.unavailable ? 'Not available for these dates.' : `${availability.available} device(s) available. Select exact units below.`}
          </p>
        )}

        {free.length > 0 && (
          <div>
            <p className="text-xs font-bold text-[#173b3b]/60">Free physical units — assign exact devices</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {free.map((d) => (
                <button key={d.id} onClick={() => toggleDevice(d.id)} className={`rounded-lg border px-3 py-2 font-mono text-xs font-bold ${selected.includes(d.id) ? 'border-[#173b3b] bg-[#173b3b] text-white' : 'border-[#173b3b]/15 bg-[#f7f5ef] text-[#173b3b]/70'}`}>
                  {d.assetCode}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm font-bold text-[#a43d2b]">{error}</p>}

        <button onClick={submit} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#e76f51] py-4 text-sm font-bold text-white disabled:opacity-50">
          {busy && <Loader2 size={16} className="animate-spin" />} Create booking
        </button>
      </div>
    </div>
  )
}