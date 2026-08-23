'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { saveHomeSeoAction } from '@/app/actions/cms'
import type { HomeSeo } from '@/lib/services/cms'

const inputCls = 'mt-1 w-full rounded-lg border border-[#173b3b]/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#e76f51]'

export default function SeoEditor({ seo }: { seo: HomeSeo }) {
  const router = useRouter()
  const [form, setForm] = useState(seo)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const res = await saveHomeSeoAction(form)
    setBusy(false)
    if (res.ok) { setMsg({ ok: true, text: 'SEO metadata saved.' }); router.refresh() }
    else setMsg({ ok: false, text: res.error })
  }

  return (
    <form onSubmit={save} className="mt-6 max-w-2xl rounded-2xl border border-[#173b3b]/10 bg-white p-6">
      <h2 className="font-serif text-xl font-bold">SEO metadata</h2>
      <p className="mt-1 text-xs text-[#173b3b]/55">Applied to the storefront home page&apos;s title tag and search-engine description.</p>
      <div className="mt-4 grid gap-4">
        <label className="block text-sm font-semibold">
          SEO title
          <input className={inputCls} value={form.seoTitle} onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))} placeholder="Go-Sewa — Rent the tech you need" />
        </label>
        <label className="block text-sm font-semibold">
          Meta description
          <textarea rows={3} className={inputCls} value={form.seoDescription} onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))} placeholder="Premium smartphone, camera and creator gear rentals in Bali." />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={form.noindex} onChange={(e) => setForm((f) => ({ ...f, noindex: e.target.checked }))} />
          Hide home page from search engines (noindex)
        </label>
      </div>
      {msg && <p role={msg.ok ? undefined : 'alert'} className={`mt-4 text-sm font-semibold ${msg.ok ? 'text-[#27604a]' : 'text-[#a43d2b]'}`}>{msg.text}</p>}
      <button disabled={busy} className="mt-5 flex items-center gap-2 rounded-full bg-[#e76f51] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save SEO
      </button>
    </form>
  )
}