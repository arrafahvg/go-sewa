'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, MessageCircle, Pencil, Save, X } from 'lucide-react'
import { updateCustomerAction } from '@/app/actions/crm'
import { formatMoney } from '@/lib/utils/money'

/**
 * Customer profile header + inline contact editor + WhatsApp quick-contact
 * (spec §31B, §18, §34). The wa.me link uses the customer's stored number —
 * no business data is hardcoded here (§73).
 */
export default function CustomerProfileCard({
  customer,
  stats,
  tags,
}: {
  customer: { id: string; name: string; phone: string | null; email: string | null; address: string | null; notes: string | null; idVerified: boolean; idType: string | null; idNumber: string | null; createdAt: string }
  stats: { totalBookings: number; totalSpentCents: number; activeBookings: number; lastRentalAt: string | null }
  tags: string[]
}) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    name: customer.name,
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    address: customer.address ?? '',
    notes: customer.notes ?? '',
  })

  const save = async () => {
    setBusy(true); setError(''); setSaved(false)
    const res = await updateCustomerAction({
      id: customer.id,
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      notes: form.notes || null,
    })
    setBusy(false)
    if (!res.ok) { setError(res.error); return }
    setSaved(true)
    setEditing(false)
  }

  const field = 'w-full rounded-xl border border-[#173b3b]/15 bg-white px-3 py-2 text-sm focus:border-[#387066] focus:outline-none'

  return (
    <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">
            <Link href="/admin/customers" className="hover:underline">Customers</Link> / detail
          </p>
          <h1 className="mt-1 font-serif text-2xl tracking-tight">{editing ? 'Edit customer' : customer.name}</h1>
          {!editing && (
            <p className="mt-1 text-sm text-[#173b3b]/60">
              {customer.phone ?? 'No phone'}{customer.phone && customer.email ? ' · ' : ''}{customer.email ?? ''}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold">
            {customer.idVerified && <span className="rounded-full bg-[#e4eee8] px-2.5 py-1 text-[#27604a]">ID verified</span>}
            {customer.idType && <span className="rounded-full bg-[#f1eee7] px-2.5 py-1 text-[#173b3b]/60">{customer.idType.toUpperCase()} ···{(customer.idNumber ?? '').slice(-4)}</span>}
            {tags.map((t) => <span key={t} className="rounded-full bg-[#f7e9d9] px-2.5 py-1 text-[#8a5a24]">{t}</span>)}
            <span className="rounded-full bg-[#f1eee7] px-2.5 py-1 text-[#173b3b]/60">Since {new Date(customer.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {customer.phone && (
            <a
              href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${customer.name}, this is Go-Sewa.`)}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 text-xs font-bold text-white hover:brightness-95"
            >
              <MessageCircle size={14} /> WhatsApp
            </a>
          )}
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setError('') }} disabled={busy}
                className="flex items-center gap-1 rounded-full border border-[#173b3b]/15 px-4 py-2 text-xs font-bold hover:bg-[#f1eee7] disabled:opacity-50">
                <X size={13} /> Cancel
              </button>
              <button onClick={save} disabled={busy}
                className="flex items-center gap-1 rounded-full bg-[#173b3b] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1 rounded-full border border-[#173b3b]/15 px-4 py-2 text-xs font-bold hover:bg-[#e4eee8]">
              <Pencil size={13} /> Edit details
            </button>
          )}
        </div>
      </div>

      {/* Lifetime stats (§31) */}
      {!editing && (
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Total bookings', String(stats.totalBookings)],
            ['Active rentals', String(stats.activeBookings)],
            ['Total spending', formatMoney(stats.totalSpentCents)],
            ['Last rental', stats.lastRentalAt ? new Date(stats.lastRentalAt).toLocaleDateString() : '—'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-[#f7f5ef] px-4 py-3">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-[#173b3b]/45">{label}</dt>
              <dd className="mt-0.5 text-sm font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {editing && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-[#173b3b]/70">Full name
            <input className={`mt-1 ${field}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="text-xs font-bold text-[#173b3b]/70">WhatsApp / phone
            <input className={`mt-1 ${field}`} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+62…" />
          </label>
          <label className="text-xs font-bold text-[#173b3b]/70">Email
            <input type="email" className={`mt-1 ${field}`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="text-xs font-bold text-[#173b3b]/70">Address
            <input className={`mt-1 ${field}`} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>
          <label className="text-xs font-bold text-[#173b3b]/70 sm:col-span-2">Internal notes (never shown to the customer)
            <textarea rows={3} className={`mt-1 ${field}`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
        </div>
      )}

      {error && <p className="mt-3 text-sm font-semibold text-[#a43d2b]">{error}</p>}
      {saved && !editing && <p className="mt-3 text-sm font-semibold text-[#27604a]">Customer details saved.</p>}
      {!editing && (customer.address || customer.notes) && (
        <div className="mt-4 space-y-1 text-sm text-[#173b3b]/70">
          {customer.address && <p><span className="font-bold">Address:</span> {customer.address}</p>}
          {customer.notes && <p className="whitespace-pre-line"><span className="font-bold">Notes:</span> {customer.notes}</p>}
        </div>
      )}
    </div>
  )
}

