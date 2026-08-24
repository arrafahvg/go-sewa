'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Check, Loader2, Plus, Trash2 } from 'lucide-react'
import { formatMoney } from '@/lib/utils/money'
import { createManualInvoiceAction } from '@/app/actions/invoices'
import CustomerPicker from '@/components/admin/customer-picker'

type ExistingCustomer = { id: string; name: string; phone: string | null; email?: string | null }
type Line = { description: string; quantity: number; unitPrice: number }

/**
 * Staff "New manual invoice" form (spec §35) — create a booking-less invoice with
 * free-form line items, reusing an existing customer or creating one inline. The
 * amount fields take plain Rupiah; the server action converts to minor units.
 */
export default function ManualInvoiceForm({ customers }: { customers: ExistingCustomer[] }) {
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [lines, setLines] = useState<Line[]>([{ description: '', quantity: 1, unitPrice: 0 }])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<string | null>(null)

  const updateLine = (i: number, patch: Partial<Line>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }
  const addLine = () => setLines((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0 }])
  const removeLine = (i: number) => setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))

  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0)

  const submit = async () => {
    if (!name.trim()) { setError('Enter the customer name.'); return }
    const valid = lines.filter((l) => l.description?.trim())
    if (valid.length === 0) { setError('Add at least one line item with a description.'); return }
    if (total <= 0) { setError('Invoice total must be greater than zero.'); return }
    setBusy(true); setError('')
    const res = await createManualInvoiceAction({
      customerId,
      customerName: name.trim(), customerPhone: phone.trim() || null, customerEmail: email.trim() || null,
      dueAt: dueAt || null,
      lines: valid.map((l) => ({ description: l.description.trim(), quantity: Number(l.quantity) || 1, unitPrice: Number(l.unitPrice) || 0 })),
    })
    setBusy(false)
    if (!res.ok) { setError(res.error); return }
    setResult(res.invoiceId)
  }

  const inputCls = 'mt-2 w-full rounded-xl border border-[#173b3b]/12 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#e76f51]'
  const lineCls = 'w-full rounded-xl border border-[#173b3b]/12 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#e76f51]'
return (
    <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
      <h2 className="font-bold">New manual invoice</h2>
      <p className="mt-1 text-xs text-[#173b3b]/55">Issue a booking-less invoice with free-form lines — e.g. a deposit-only or one-off charge. The customer and invoice are created for real and audit-logged.</p>

      {result && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[#8bc0a8] bg-[#e4eee8] px-4 py-3">
          <p className="text-sm font-bold text-[#27604a]"><Check size={15} className="inline" /> Invoice created.</p>
          <Link href={`/admin/invoices/${result}`} className="rounded-full bg-[#173b3b] px-4 py-2 text-xs font-bold text-white">Open invoice →</Link>
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-bold text-[#173b3b]/60">Customer</p>
          <CustomerPicker
            customers={customers}
            value={{ customerId, name, phone, email }}
            onSelect={(v) => { setCustomerId(v.customerId); setName(v.name); setPhone(v.phone); setEmail(v.email) }}
          />
        </div>
        <label className="block text-sm font-bold text-[#173b3b]/60">Due date (optional)
          <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={inputCls} />
          <span className="mt-1 block text-xs text-[#173b3b]/40">Leave blank to issue without a due date.</span>
        </label>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold text-[#173b3b]/60">Line items (Rp amounts)</p>
          <button onClick={addLine} className="flex items-center gap-1.5 rounded-full border border-[#173b3b]/15 px-3 py-1.5 text-xs font-bold text-[#173b3b]/70 hover:bg-[#e4eee8]"><Plus size={13} /> Add line</button>
        </div>
        <div className="space-y-2">
          <div className="grid items-center gap-2 text-xs text-[#173b3b]/45 sm:grid-cols-[1fr_72px_170px_72px]">
            <span>Description</span><span className="text-center">Qty</span><span className="text-right">Unit price (Rp)</span><span />
          </div>
          {lines.map((l, i) => (
            <div key={i} className="grid items-center gap-2 sm:grid-cols-[1fr_72px_170px_72px]">
              <input value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} className={lineCls} placeholder="e.g. Deposit — GoPro HERO 12" />
              <input type="number" min={1} value={String(l.quantity)} onChange={(e) => updateLine(i, { quantity: Math.max(1, Number(e.target.value) || 1) })} className={lineCls} />
              <input type="number" min={0} value={String(l.unitPrice)} onChange={(e) => updateLine(i, { unitPrice: Math.max(0, Number(e.target.value) || 0) })} className={lineCls} />
              <button onClick={() => removeLine(i)} disabled={lines.length <= 1} className="grid place-items-center rounded-lg border border-[#a43d2b]/30 p-2 text-[#a43d2b] disabled:opacity-30" aria-label="Remove line"><Trash2 size={14} /></button>
            </div>
          ))}
          <div className="mt-2 flex justify-end rounded-xl bg-[#f1eee7] px-4 py-2.5">
            <p className="text-sm font-bold text-[#173b3b]">Total {formatMoney(Math.round(total * 100))}</p>
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-sm font-bold text-[#a43d2b]">{error}</p>}

      <button onClick={submit} disabled={busy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#e76f51] py-3.5 text-sm font-bold text-white disabled:opacity-50">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        Create manual invoice
      </button>
    </div>
  )
}