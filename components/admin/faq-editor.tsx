'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Plus, Trash2 } from 'lucide-react'
import { saveFaqAction, deleteFaqAction } from '@/app/actions/cms'
import type { CmsFaq } from '@/lib/types/cms'

const inputCls = 'mt-1 w-full rounded-lg border border-[#173b3b]/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#e76f51]'

export default function FaqEditor({ items }: { items: CmsFaq[] }) {
  const router = useRouter()
  const refresh = () => router.refresh()
  const [editing, setEditing] = useState<CmsFaq | 'new' | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  return (
    <div className="mt-6 rounded-2xl border border-[#173b3b]/10 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-bold">FAQ</h2>
          <p className="mt-1 text-xs text-[#173b3b]/55">Questions shown at the bottom of the storefront home page.</p>
        </div>
        <button onClick={() => setEditing(editing === 'new' ? null : 'new')} className="flex items-center gap-2 rounded-full bg-[#e76f51] px-4 py-2 text-sm font-bold text-white">
          <Plus size={15} /> Add question
        </button>
      </div>

      {editing === 'new' && <FaqForm faq={null} onDone={(ok) => { if (ok) { setEditing(null); refresh() } }} />}

      <ul className="mt-5 divide-y divide-[#173b3b]/8">
        {items.length === 0 && <li className="py-8 text-sm text-[#173b3b]/50">No FAQ entries yet.</li>}
        {items.map((f) => (
          <li key={f.id} className="py-3">
            {editing && editing !== 'new' && editing.id === f.id
              ? <FaqForm faq={f} onDone={(ok) => { if (ok) { setEditing(null); refresh() } }} onCancel={() => setEditing(null)} />
              : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{f.question}</p>
                    <p className="text-sm text-[#173b3b]/60">{f.answer}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!f.active && <span className="rounded-full bg-[#f0ecd0] px-2.5 py-1 text-[11px] font-bold text-[#7a6a2a]">hidden</span>}
                    <button onClick={() => setEditing(typeof editing === 'object' && editing !== null && editing.id === f.id ? null : f)} className="rounded-full border border-[#173b3b]/15 px-3 py-1.5 text-xs font-bold hover:bg-[#e4eee8]">Edit</button>
                    <button disabled={busy === f.id} onClick={async () => { setBusy(f.id); const r = await deleteFaqAction(f.id); setBusy(''); if (r.ok) refresh(); else setError(r.error) }}
                      className="flex items-center gap-1 rounded-full border border-[#173b3b]/15 px-3 py-1.5 text-xs font-bold text-[#a43d2b] hover:bg-[#f5d9d3] disabled:opacity-50">
                      {busy === f.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
                    </button>
                  </div>
                </div>
              )}
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-[#a43d2b]">{error}</p>}
    </div>
  )
}

function FaqForm({ faq, onDone, onCancel }: { faq: CmsFaq | null; onDone: (ok: boolean) => void; onCancel?: () => void }) {
  const [question, setQuestion] = useState(faq?.question ?? '')
  const [answer, setAnswer] = useState(faq?.answer ?? '')
  const [active, setActive] = useState(faq?.active ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const res = await saveFaqAction({ id: faq?.id, question, answer, active })
    setBusy(false)
    if (res.ok) onDone(true)
    else setError(res.error)
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-xl bg-[#f7f5ef] p-4">
      <div className="grid gap-3">
        <label className="block text-sm font-semibold">Question<input className={inputCls} value={question} onChange={(e) => setQuestion(e.target.value)} required /></label>
        <label className="block text-sm font-semibold">Answer<textarea rows={2} className={inputCls} value={answer} onChange={(e) => setAnswer(e.target.value)} required /></label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Visible on storefront
        </label>
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-[#a43d2b]">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button disabled={busy} className="flex items-center gap-2 rounded-full bg-[#173b3b] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="rounded-full border border-[#173b3b]/15 px-4 py-2 text-sm font-bold hover:bg-[#e4eee8]">Cancel</button>}
      </div>
    </form>
  )
}