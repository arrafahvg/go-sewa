'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { saveHomeSectionsAction } from '@/app/actions/cms'
import type { HomeSection } from '@/lib/types/cms'

const inputCls = 'mt-1 w-full rounded-lg border border-[#173b3b]/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#e76f51]'

export default function HeroEditor({ sections }: { sections: HomeSection[] }) {
  const router = useRouter()
  const hero = sections.find((s) => s.type === 'hero') ?? { type: 'hero' as const, kicker: '', headline: '', sub: '' }
  const [form, setForm] = useState({ kicker: hero.kicker, headline: hero.headline, sub: hero.sub })
  const [state, setState] = useState<{ phase: 'idle' | 'loading' | 'ok' | 'error'; message?: string }>({ phase: 'idle' })

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setState({ phase: 'loading' })
    const next: HomeSection[] = [{ type: 'hero', ...form }]
    const res = await saveHomeSectionsAction(next)
    if (res.ok) {
      setState({ phase: 'ok', message: 'Homepage saved.' })
      router.refresh()
    } else {
      setState({ phase: 'error', message: res.error })
    }
  }

  return (
    <form onSubmit={save} className="mt-6 max-w-2xl rounded-2xl border border-[#173b3b]/10 bg-white p-6">
      <h2 className="font-serif text-xl font-bold">Homepage hero</h2>
      <p className="mt-1 text-xs text-[#173b3b]/55">Edits the headline block shown at the top of the storefront home page.</p>
      <div className="mt-4 grid gap-4">
        <label className="block text-sm font-semibold">
          Kicker / eyebrow
          <input className={inputCls} value={form.kicker} onChange={(e) => setForm((f) => ({ ...f, kicker: e.target.value }))} />
        </label>
        <label className="block text-sm font-semibold">
          Headline
          <input className={inputCls} value={form.headline} onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))} />
        </label>
        <label className="block text-sm font-semibold">
          Sub-text
          <textarea rows={3} className={inputCls} value={form.sub} onChange={(e) => setForm((f) => ({ ...f, sub: e.target.value }))} />
        </label>
      </div>
      {state.phase === 'ok' && <p className="mt-4 text-sm font-semibold text-[#27604a]">{state.message}</p>}
      {state.phase === 'error' && <p role="alert" className="mt-4 text-sm font-semibold text-[#a43d2b]">{state.message}</p>}
      <button disabled={state.phase === 'loading'} className="mt-5 flex items-center gap-2 rounded-full bg-[#e76f51] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
        {state.phase === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save hero
      </button>
    </form>
  )
}