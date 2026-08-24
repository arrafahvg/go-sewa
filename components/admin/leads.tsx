'use client'

import { useState } from 'react'
import { Loader2, Plus, UserCheck } from 'lucide-react'
import { saveLeadAction, updateLeadStatusAction, convertLeadAction } from '@/app/actions/crm'

type Lead = {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  source: string | null
  interest: string | null
  notes: string | null
  status: string
  createdAt: string
}

const STATUSES = ['new', 'contacted', 'interested', 'quotation_sent', 'booking_pending', 'won', 'lost']

export default function LeadsManager({ leads }: { leads: Lead[] }) {
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [interest, setInterest] = useState('')

  const run = async (key: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(key); setError(''); setSuccess('')
    const res = await fn()
    setBusy('')
    if (!res.ok) setError(res.error ?? 'Operation failed.')
    return res.ok
  }

  const rows = filter === 'all' ? leads : leads.filter((l) => l.status === filter)

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#173b3b]">
      <div className="px-4 py-8 sm:px-6 xl:px-10">
        <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45"><a href="/admin" className="hover:underline">Admin</a> / Leads</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-3xl tracking-tight">Leads</h1>
          <span className="rounded-full bg-[#e4eee8] px-2.5 py-1 text-[11px] font-bold text-[#387066]">{leads.length} total</span>
        </div>

        {error && <p className="mt-2 text-sm font-bold text-[#a43d2b]">{error}</p>}
        {success && <p className="mt-2 text-sm font-bold text-[#27604a]">{success}</p>}

        <div className="mt-5 rounded-2xl border border-dashed border-[#173b3b]/15 bg-white p-5">
          <button onClick={() => setCreating((v) => !v)} className="flex items-center gap-2 text-sm font-bold text-[#387066]"><Plus size={15} /> {creating ? 'Close new lead form' : 'Add lead'}</button>
          {creating && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-[#173b3b]/15 bg-[#f7f5ef] px-3 py-2 text-sm" placeholder="Full name *" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-lg border border-[#173b3b]/15 bg-[#f7f5ef] px-3 py-2 text-sm" placeholder="Phone +628..." />
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg border border-[#173b3b]/15 bg-[#f7f5ef] px-3 py-2 text-sm" placeholder="Email" />
              <input value={interest} onChange={(e) => setInterest(e.target.value)} className="rounded-lg border border-[#173b3b]/15 bg-[#f7f5ef] px-3 py-2 text-sm" placeholder="Interest (e.g. GoPro for weekend)" />
              <button
                onClick={() => run('create', async () => {
                  const r = await saveLeadAction({ name, phone: phone || null, email: email || null, interest: interest || null })
                  if (r.ok) { setName(''); setPhone(''); setEmail(''); setInterest(''); setCreating(false); setSuccess('Lead added.') }
                  return r
                })}
                disabled={busy !== '' || !name.trim()}
                className="rounded-full bg-[#173b3b] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50"
              >{busy === 'create' && <Loader2 size={13} className="inline animate-spin" />} Save lead</button>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(['all', ...STATUSES] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${filter === s ? 'bg-[#173b3b] text-white' : 'bg-[#f1eee7] text-[#173b3b]/70'}`}>{s.replace(/_/g, ' ')}</button>
          ))}
        </div>
<div className="mt-6 rounded-2xl border border-[#173b3b]/10 bg-white overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#f1eee7] text-xs text-[#173b3b]/50">
              <tr>{['Name', 'Contact', 'Interest', 'Status', 'Actions'].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[#173b3b]/50">No leads here yet.</td></tr>}
              {rows.map((l) => (
                <tr key={l.id} className="border-t border-[#173b3b]/8 transition hover:bg-[#faf8f2]">
                  <td className="px-5 py-4 font-bold">{l.name ?? '—'}</td>
                  <td className="px-5 py-4 text-xs">{l.phone ?? ''}{l.phone && l.email ? ' · ' : ''}{l.email ?? ''}</td>
                  <td className="px-5 py-4 text-xs">{l.interest ?? '—'}</td>
                  <td className="px-5 py-4">
                    <select value={l.status} onChange={(e) => run(`${l.id}-st`, async () => updateLeadStatusAction(l.id, e.target.value))}
                      className="rounded-full border border-[#173b3b]/15 bg-[#f7f5ef] px-3 py-1.5 text-xs font-bold">
                      {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    {!['won', 'lost'].includes(l.status) && (
                      <button onClick={() => run(`${l.id}-conv`, async () => convertLeadAction(l.id))} disabled={busy !== ''}
                        className="flex items-center gap-1 rounded-full bg-[#27604a] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                        {busy === `${l.id}-conv` ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={13} />} Convert to customer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}