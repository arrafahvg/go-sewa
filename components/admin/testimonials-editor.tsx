'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Plus, Star, Trash2 } from 'lucide-react'
import { saveTestimonialAction, deleteTestimonialAction } from '@/app/actions/cms'
import type { CmsTestimonial } from '@/lib/types/cms'

const inputCls = 'mt-1 w-full rounded-lg border border-[#173b3b]/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#e76f51]'

export default function TestimonialsEditor({ items }: { items: CmsTestimonial[] }) {
  const router = useRouter()
  const refresh = () => router.refresh()
  const [editing, setEditing] = useState<CmsTestimonial | 'new' | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  return (
    <div className="mt-6 rounded-2xl border border-[#173b3b]/10 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-bold">Testimonials</h2>
          <p className="mt-1 text-xs text-[#173b3b]/55">Customer quotes shown on the storefront home page.</p>
        </div>
        <button onClick={() => setEditing(editing === 'new' ? null : 'new')} className="flex items-center gap-2 rounded-full bg-[#e76f51] px-4 py-2 text-sm font-bold text-white">
          <Plus size={15} /> Add testimonial
        </button>
      </div>

      {editing === 'new' && <TestimonialForm item={null} onDone={(ok) => { if (ok) { setEditing(null); refresh() } }} />}

      <ul className="mt-5 divide-y divide-[#173b3b]/8">
        {items.length === 0 && <li className="py-8 text-sm text-[#173b3b]/50">No testimonials yet.</li>}
        {items.map((t) => (
          <li key={t.id} className="py-3">
            {editing && editing !== 'new' && editing.id === t.id
              ? <TestimonialForm item={t} onDone={(ok) => { if (ok) { setEditing(null); refresh() } }} onCancel={() => setEditing(null)} />
              : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{t.name} <span className="ml-2 inline-flex items-center text-amber-500"><Star size={12} fill="currentColor" /> {t.rating}</span></p>
                    <p className="text-sm text-[#173b3b]/60">“{t.quote}”</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!t.active && <span className="rounded-full bg-[#f0ecd0] px-2.5 py-1 text-[11px] font-bold text-[#7a6a2a]">hidden</span>}
                    <button onClick={() => setEditing(typeof editing === 'object' && editing !== null && editing.id === t.id ? null : t)} className="rounded-full border border-[#173b3b]/15 px-3 py-1.5 text-xs font-bold hover:bg-[#e4eee8]">Edit</button>
                    <button disabled={busy === t.id} onClick={async () => { setBusy(t.id); const r = await deleteTestimonialAction(t.id); setBusy(''); if (r.ok) refresh(); else setError(r.error) }}
                      className="flex items-center gap-1 rounded-full border border-[#173b3b]/15 px-3 py-1.5 text-xs font-bold text-[#a43d2b] hover:bg-[#f5d9d3] disabled:opacity-50">
                      {busy === t.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
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

function TestimonialForm({ item, onDone, onCancel }: { item: CmsTestimonial | null; onDone: (ok: boolean) => void; onCancel?: () => void }) {
  const [name, setName] = useState(item?.name ?? '')
  const [quote, setQuote] = useState(item?.quote ?? '')
  const [rating, setRating] = useState(item?.rating ?? 5)
  const [active, setActive] = useState(item?.active ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const res = await saveTestimonialAction({ id: item?.id, name, quote, rating, active })
    setBusy(false)
    if (res.ok) onDone(true)
    else setError(res.error)
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-xl bg-[#f7f5ef] p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <label className="block text-sm font-semibold">Name<input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label className="block text-sm font-semibold">Rating (1–5)<input type="number" min={1} max={5} className={inputCls} value={rating} onChange={(e) => setRating(Number(e.target.value))} /></label>
        <label className="block text-sm font-semibold sm:col-span-2">Quote<textarea rows={2} className={inputCls} value={quote} onChange={(e) => setQuote(e.target.value)} required /></label>
        <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
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