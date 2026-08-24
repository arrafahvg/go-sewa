'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Check, Loader2, Plus, Trash2 } from 'lucide-react'
import { createManualAgreementAction } from '@/app/actions/agreements'

type ExistingCustomer = { id: string; name: string; phone: string | null }
type Line = { description: string; quantity: number }

/**
 * Staff "New manual agreement" form (spec §21/§35) — create a booking-less rental
 * agreement from a customer + free-form equipment/terms lines. Merged from the
 * active template by the service; draft is printable/signable/shareable.
 */
export default function ManualAgreementForm({ customers }: { customers: ExistingCustomer[] }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [lines, setLines] = useState<Line[]>([{ description: '', quantity: 1 }])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<string | null>(null)

  const updateLine = (i: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  const addLine = () => setLines((prev) => [...prev, { description: '', quantity: 1 }])
  const removeLine = (i: number) => setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))

  const submit = async () => {
    if (!name.trim()) { setError('Enter the customer name.'); return }
    const valid = lines.filter((l) => l.description?.trim())
    if (valid.length === 0) { setError('Add at least one equipment/terms line.'); return }
    setBusy(true); setError('')
    const res = await createManualAgreementAction({
      customerName: name.trim(), customerPhone: phone.trim() || null, customerEmail: email.trim() || null,
      lines: valid.map((l) => ({ description: l.description.trim(), quantity: Math.max(1, Number(l.quantity) || 1) })),
    })
    setBusy(false)
    if (!res.ok) { setError(res.error); return }
    setResult(res.agreementId)
  }

  const inputCls = 'mt-2 w-full rounded-xl border border-[#173b3b]/12 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#e76f51]'
  const lineCls = 'w-full rounded-xl border border-[#173b3b]/12 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#e76f51]'

  return (
    <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
      <h2 className="font-bold">New manual agreement</h2>
      <p className="mt-1 text-xs text-[#173b3b]/55">Create a booking-less rental agreement: pick/reuse a customer and list the equipment or terms. It is merged from the active template, stored as a draft, and ready to print, sign and share.</p>

      {result && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[#8bc0a8] bg-[#e4eee8] px-4 py-3">
          <p className="text-sm font-bold text-[#27604a]"><Check size={15} className="inline" /> Agreement created.</p>
          <Link href={`/admin/agreements/${result}`} className="rounded-full bg-[#173b3b] px-4 py-2 text-xs font-bold text-white">Open agreement →</Link>
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-bold text-[#173b3b]/60">Customer name
          <input list="manual-agreement-customers" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Type a new name or pick existing" required />
        </label>
        <datalist id="manual-agreement-customers">
          {customers.map((c) => <option key={c.id} value={c.name}>{c.phone ? ` · ${c.phone}` : ''}</option>)}
        </datalist>
        <label className="block text-sm font-bold text-[#173b3b]/60">WhatsApp / phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+62 812 ..." />
        </label>
        <label className="block text-sm font-bold text-[#173b3b]/60">Email (optional)
          <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="name@example.com" />
        </label>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold text-[#173b3b]/60">Equipment / terms</p>
          <button onClick={addLine} className="flex items-center gap-1.5 rounded-full border border-[#173b3b]/15 px-3 py-1.5 text-xs font-bold text-[#173b3b]/70 hover:bg-[#e4eee8]"><Plus size={13} /> Add line</button>
        </div>
        <div className="space-y-2">
          <div className="grid items-center gap-2 text-xs text-[#173b3b]/45 sm:grid-cols-[1fr_80px_72px]">
            <span>Item / term</span><span className="text-center">Qty</span><span />
          </div>
          {lines.map((l, i) => (
            <div key={i} className="grid items-center gap-2 sm:grid-cols-[1fr_80px_72px]">
              <input value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} className={lineCls} placeholder="e.g. GoPro HERO 12 + mounts" />
              <input type="number" min={1} value={String(l.quantity)} onChange={(e) => updateLine(i, { quantity: Math.max(1, Number(e.target.value) || 1) })} className={lineCls} />
              <button onClick={() => removeLine(i)} disabled={lines.length <= 1} className="grid place-items-center rounded-lg border border-[#a43d2b]/30 p-2 text-[#a43d2b] disabled:opacity-30" aria-label="Remove line"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="mt-3 text-sm font-bold text-[#a43d2b]">{error}</p>}

      <button onClick={submit} disabled={busy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#e76f51] py-3.5 text-sm font-bold text-white disabled:opacity-50">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        Create manual agreement
      </button>
    </div>
  )
}