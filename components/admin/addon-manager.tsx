'use client'

import { Fragment, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import {
  createAddOnAction,
  deleteAddOnAction,
  listAddOnProductIdsAction,
  setAddOnProductsAction,
  updateAddOnAction,
} from '@/app/actions/addons'
import { rupiahToCents, formatMoney } from '@/lib/utils/money'

type AddOnRow = {
  id: string
  nameId: string
  nameEn: string
  centsPerDay: number
  centsPerRental: number
  active: boolean
  productCount: number
}

const inputCls = 'mt-1 w-full rounded-lg border border-[#173b3b]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#387066]'
const selectCls = 'rounded-lg border border-[#173b3b]/15 bg-white px-2.5 py-1.5 text-xs font-bold text-[#173b3b] outline-none focus:border-[#387066] disabled:opacity-50'

/**
 * Rental add-on manager (§2C/§73): create/edit bilingual optional add-ons with
 * per-day or per-rental pricing, toggle availability, and safely delete unused
 * ones. All writes go through staff-gated, audit-logged server actions.
 */
export default function AddOnManager({ addOns, products, attachRows }: { addOns: AddOnRow[]; products: { id: string; name: string }[]; attachRows: { addOnId: string; productId: string }[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newNameId, setNewNameId] = useState('')
  const [newNameEn, setNewNameEn] = useState('')
  const [newPriceMode, setNewPriceMode] = useState<'per_day' | 'per_rental'>('per_day')
  const [newRupiah, setNewRupiah] = useState('')
  // Draft edits for the row being edited.
  const [draft, setDraft] = useState<{ nameId: string; nameEn: string; centsPerDay: number; centsPerRental: number; active: boolean } | null>(null)
  // Attached-products editor state (add-on side): which row is open + its draft selection.
  const [attachOpenId, setAttachOpenId] = useState<string | null>(null)
  const [attachDraft, setAttachDraft] = useState<string[]>([])

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMessage: string, busyKey?: string) {
    setBusyId(busyKey ?? 'form'); setError(''); setSuccess('')
    const res = await fn()
    setBusyId(null)
    if (!res.ok) { setError(res.error ?? 'Something went wrong.'); return false }
    setSuccess(okMessage)
    router.refresh()
    return true
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!newNameId.trim() || !newNameEn.trim()) { setError('Both Indonesian and English names are required.'); return }
    const cents = rupiahToCents(newRupiah)
    if (!Number.isFinite(cents) || cents < 0) { setError('Enter a valid price in Rupiah (or 0 for free).'); return }
    const ok = await run(
      () => createAddOnAction({
        nameId: newNameId,
        nameEn: newNameEn,
        ...(newPriceMode === 'per_day' ? { centsPerDay: cents } : { centsPerRental: cents }),
      }),
      'Add-on created.',
    )
    if (ok) { setNewNameId(''); setNewNameEn(''); setNewRupiah(''); setNewPriceMode('per_day') }
  }

  function startEdit(row: AddOnRow) {
    setEditingId(row.id)
    setDraft({ nameId: row.nameId, nameEn: row.nameEn, centsPerDay: row.centsPerDay, centsPerRental: row.centsPerRental, active: row.active })
    setSuccess(''); setError('')
  }

  async function saveEdit(id: string) {
    if (!draft) return
    const ok = await run(
      () => updateAddOnAction(id, {
        nameId: draft.nameId,
        nameEn: draft.nameEn,
        centsPerDay: draft.centsPerDay,
        centsPerRental: draft.centsPerRental,
        active: draft.active,
      }),
      'Add-on updated.',
      id,
    )
    if (ok) { setEditingId(null); setDraft(null) }
  }

  async function remove(row: AddOnRow) {
    if (!confirm(`Delete add-on “${row.nameEn}”? This cannot be undone.`)) return
    await run(() => deleteAddOnAction(row.id), 'Add-on deleted.', row.id)
  }

  async function openAttach(row: AddOnRow) {
    if (attachOpenId === row.id) { setAttachOpenId(null); return }
    setBusyId(row.id)
    const ids = await listAddOnProductIdsAction(row.id)
    setBusyId(null)
    setAttachDraft(ids)
    setAttachOpenId(row.id)
    setSuccess(''); setError('')
  }

  function toggleAttachProduct(id: string) {
    setAttachDraft((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }

  async function saveAttach(addOnId: string) {
    const ok = await run(
      () => setAddOnProductsAction(addOnId, attachDraft),
      attachDraft.length > 0 ? `Attached to ${attachDraft.length} product${attachDraft.length === 1 ? '' : 's'}.` : 'Detached from all products.',
      addOnId,
    )
    if (ok) { setAttachOpenId(null); setAttachDraft([]) }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
        <h2 className="flex items-center gap-2 font-bold"><Plus size={17} /> New add-on</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-5">
          <label className="block text-xs font-bold text-[#173b3b]/60">Name (Indonesian)
            <input value={newNameId} onChange={(e) => setNewNameId(e.target.value)} required className={inputCls} placeholder="e.g. Asuransi layar" />
          </label>
          <label className="block text-xs font-bold text-[#173b3b]/60">Name (English)
            <input value={newNameEn} onChange={(e) => setNewNameEn(e.target.value)} required className={inputCls} placeholder="e.g. Screen insurance" />
          </label>
          <label className="block text-xs font-bold text-[#173b3b]/60">Pricing mode
            <select value={newPriceMode} onChange={(e) => setNewPriceMode(e.target.value as 'per_day' | 'per_rental')} className={inputCls}>
              <option value="per_day">Per day</option>
              <option value="per_rental">One-off per rental</option>
            </select>
          </label>
          <label className="block text-xs font-bold text-[#173b3b]/60">Price (Rp)
            <input value={newRupiah} onChange={(e) => setNewRupiah(e.target.value)} inputMode="numeric" className={inputCls} placeholder="e.g. 25000" />
          </label>
          <div className="flex items-end">
            <button disabled={busyId === 'form'} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#173b3b] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
              {busyId === 'form' && <Loader2 size={15} className="animate-spin" />} Create add-on
            </button>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-[#173b3b]/45">
          Newly created add-ons are not attached to any product yet — attach them per product from Inventory → Edit product → Optional add-ons.
        </p>
      </form>

      {(error || success) && (
        <div role="status" aria-live="polite" className={`rounded-xl px-4 py-3 text-sm font-semibold ${error ? 'border border-[#e8a09a] bg-[#f5d9d3] text-[#a43d2b]' : 'border border-[#8bc0a8] bg-[#e4eee8] text-[#27604a]'}`}>
          {error || success}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[#173b3b]/10 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#173b3b]/10 text-xs uppercase tracking-wide text-[#173b3b]/50">
              <th className="px-4 py-3 font-bold">Add-on (ID / EN)</th>
              <th className="px-4 py-3 font-bold">Per day</th>
              <th className="px-4 py-3 font-bold">Per rental</th>
              <th className="px-4 py-3 font-bold">Attached products</th>
              <th className="px-4 py-3 font-bold">Storefront</th>
              <th className="px-4 py-3 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {addOns.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[#173b3b]/50">No add-ons yet — create your first one above.</td></tr>
            )}
            {addOns.map((row) => editingId === row.id && draft ? (
              <tr key={row.id} className="border-b border-[#173b3b]/8 bg-[#faf8f2]">
                <td className="px-4 py-3" colSpan={6}>
                  <div className="grid gap-3 sm:grid-cols-5">
                    <label className="block text-xs font-bold text-[#173b3b]/60">Indonesian
                      <input value={draft.nameId} onChange={(e) => setDraft({ ...draft, nameId: e.target.value })} className={inputCls} />
                    </label>
                    <label className="block text-xs font-bold text-[#173b3b]/60">English
                      <input value={draft.nameEn} onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })} className={inputCls} />
                    </label>
                    <label className="block text-xs font-bold text-[#173b3b]/60">Per day (Rupiah)
                      <input type="number" min={0} value={Math.round(draft.centsPerDay / 100)} onChange={(e) => setDraft({ ...draft, centsPerDay: Math.round((Number(e.target.value) || 0) * 100) })} className={inputCls} />
                    </label>
                    <label className="block text-xs font-bold text-[#173b3b]/60">Per rental (Rupiah)
                      <input type="number" min={0} value={Math.round(draft.centsPerRental / 100)} onChange={(e) => setDraft({ ...draft, centsPerRental: Math.round((Number(e.target.value) || 0) * 100) })} className={inputCls} />
                    </label>
                    <label className="block text-xs font-bold text-[#173b3b]/60">Storefront
                      <select value={draft.active ? 'active' : 'inactive'} onChange={(e) => setDraft({ ...draft, active: e.target.value === 'active' })} className={inputCls}>
                        <option value="active">Active — offered</option>
                        <option value="inactive">Inactive — hidden</option>
                      </select>
                    </label>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button type="button" onClick={() => { setEditingId(null); setDraft(null) }} className="rounded-full border border-[#173b3b]/15 px-4 py-1.5 text-xs font-bold">Cancel</button>
                    <button type="button" onClick={() => saveEdit(row.id)} disabled={busyId === row.id} className="flex items-center gap-1.5 rounded-full bg-[#173b3b] px-4 py-1.5 text-xs font-bold text-white disabled:opacity-60">
                      {busyId === row.id && <Loader2 size={13} className="animate-spin" />} Save
                    </button>
                  </div>
                </td>
              </tr>

            ) : (
              <Fragment key={row.id}>
              <tr className="border-b border-[#173b3b]/8">
                <td className="px-4 py-3">
                  <p className="font-semibold">{row.nameEn}</p>
                  <p className="text-xs text-[#173b3b]/50">{row.nameId}</p>
                </td>
                <td className="px-4 py-3">{formatMoney(row.centsPerDay)}</td>
                <td className="px-4 py-3">{formatMoney(row.centsPerRental)}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => openAttach(row)}
                    disabled={busyId === row.id}
                    className="flex items-center gap-1.5 rounded-full border border-[#173b3b]/15 px-3 py-1.5 text-xs font-bold hover:bg-[#faf8f2] disabled:opacity-60"
                    aria-label={`Edit products attached to ${row.nameEn}`}
                  >
                    {(attachRows.filter((r) => r.addOnId === row.id)).length}
                    <span className="font-normal text-[#173b3b]/50">product{(attachRows.filter((r) => r.addOnId === row.id)).length === 1 ? '' : 's'} · edit</span>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={row.active ? 'active' : 'inactive'}
                    onChange={(e) => void run(() => updateAddOnAction(row.id, { active: e.target.value === 'active' }), 'Availability updated.', row.id)}
                    disabled={busyId === row.id}
                    aria-label={`Storefront visibility for ${row.nameEn}`}
                    className={selectCls}
                  >
                    <option value="active">Active — offered</option>
                    <option value="inactive">Inactive — hidden</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => startEdit(row)} className="rounded-full border border-[#173b3b]/15 px-3 py-1.5 text-xs font-bold hover:bg-[#faf8f2]">Edit</button>
                    <button
                      type="button"
                      onClick={() => remove(row)}
                      disabled={busyId === row.id}
                      aria-label={`Delete ${row.nameEn}`}
                      className="flex items-center gap-1 rounded-full border border-[#a43d2b]/30 px-3 py-1.5 text-xs font-bold text-[#a43d2b] hover:bg-[#f5d9d3] disabled:opacity-60"
                    >
                      {busyId === row.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
                    </button>
                  </div>
                </td>
              </tr>

              {attachOpenId === row.id && (
                <tr className="border-b border-[#173b3b]/8 bg-[#faf8f2]">
                  <td colSpan={6} className="px-4 py-4">
                    <p className="text-xs font-bold text-[#173b3b]/70">
                      Products offering “{row.nameEn}”
                      {attachDraft.length > 0 && (
                        <span className="ml-2 rounded-full bg-[#e76f51] px-2 py-0.5 text-[10px] font-bold text-white">{attachDraft.length} selected</span>
                      )}
                    </p>
                    {products.length === 0 ? (
                      <p className="mt-2 text-xs text-[#173b3b]/50">No products exist yet — create products in Inventory first.</p>
                    ) : (
                      <div className="mt-2 grid max-h-56 gap-1.5 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                        {products.map((p) => (
                          <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#173b3b]/80">
                            <input type="checkbox" checked={attachDraft.includes(p.id)} onChange={() => toggleAttachProduct(p.id)} className="h-3.5 w-3.5 accent-[#e76f51]" />
                            {p.name}
                          </label>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[11px] text-[#173b3b]/45">Changes apply on save; add-ons other products attach are never affected.</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setAttachOpenId(null)} className="rounded-full border border-[#173b3b]/15 px-4 py-1.5 text-xs font-bold">Cancel</button>
                        <button type="button" onClick={() => saveAttach(row.id)} disabled={busyId === row.id} className="flex items-center gap-1.5 rounded-full bg-[#173b3b] px-4 py-1.5 text-xs font-bold text-white disabled:opacity-60">
                          {busyId === row.id && <Loader2 size={13} className="animate-spin" />} Save attachments
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>

            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

