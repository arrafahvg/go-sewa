'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { saveHomeSectionsAction, uploadHeroImageAction } from '@/app/actions/cms'
import type { HomeSection } from '@/lib/types/cms'

const inputCls = 'mt-1 w-full rounded-lg border border-[#173b3b]/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#e76f51]'

export default function HeroEditor({ sections }: { sections: HomeSection[] }) {
  const router = useRouter()
  const hero = sections.find((s) => s.type === 'hero') ?? { type: 'hero' as const, kicker: '', headline: '', sub: '', imageUrl: null, imageAlt: '' }
  const [form, setForm] = useState({
    kicker: hero.kicker,
    headline: hero.headline,
    sub: hero.sub,
    kickerEn: hero.kickerEn ?? '',
    headlineEn: hero.headlineEn ?? '',
    subEn: hero.subEn ?? '',
    imageUrl: hero.imageUrl ?? '',
    imageAlt: hero.imageAlt ?? '',
    imageAltEn: hero.imageAltEn ?? '',
  })
  const [state, setState] = useState<{ phase: 'idle' | 'loading' | 'ok' | 'error'; message?: string }>({ phase: 'idle' })
  const fileRef = useRef<HTMLInputElement>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setState({ phase: 'loading', message: 'Uploading image…' })
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = String(reader.result)
      const base64 = dataUrl.split(',')[1] ?? ''
      const res = await uploadHeroImageAction({ fileBase64: base64, mimeType: file.type })
      if (res.ok && res.url) {
        setForm((f) => ({ ...f, imageUrl: res.url! }))
        setState({ phase: 'ok', message: 'Image uploaded — remember to press "Save hero".' })
      } else {
        setState({ phase: 'error', message: res.ok ? 'Upload returned no URL.' : res.error })
      }
    }
    reader.readAsDataURL(file)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setState({ phase: 'loading' })
    const next: HomeSection[] = [{ type: 'hero', ...form, imageUrl: form.imageUrl || null }]
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
      <p className="mt-1 text-xs text-[#173b3b]/55">Edits the headline block and image shown at the top of the storefront home page. Until an image is uploaded, a bundled placeholder is shown.</p>
      <div className="mt-4 grid gap-4">
        <label className="block text-sm font-semibold">
          Kicker / eyebrow (Indonesian)
          <input className={inputCls} value={form.kicker} onChange={(e) => setForm((f) => ({ ...f, kicker: e.target.value }))} />
        </label>
        <label className="block text-sm font-semibold">
          Headline (Indonesian)
          <input className={inputCls} value={form.headline} onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))} />
        </label>
        <label className="block text-sm font-semibold">
          Sub-text (Indonesian)
          <textarea rows={3} className={inputCls} value={form.sub} onChange={(e) => setForm((f) => ({ ...f, sub: e.target.value }))} />
        </label>
        <div className="rounded-xl border border-[#173b3b]/10 bg-[#faf8f2] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">English version — optional</p>
          <p className="mt-1 text-xs font-normal text-[#173b3b]/50">Shown when a visitor uses the EN switch. Any field left blank falls back to the Indonesian text above.</p>
          <div className="mt-3 grid gap-4">
            <label className="block text-sm font-semibold">
              Kicker / eyebrow (English)
              <input className={inputCls} value={form.kickerEn} onChange={(e) => setForm((f) => ({ ...f, kickerEn: e.target.value }))} placeholder="Leave blank to reuse the Indonesian text" />
            </label>
            <label className="block text-sm font-semibold">
              Headline (English)
              <input className={inputCls} value={form.headlineEn} onChange={(e) => setForm((f) => ({ ...f, headlineEn: e.target.value }))} placeholder="Leave blank to reuse the Indonesian text" />
            </label>
            <label className="block text-sm font-semibold">
              Sub-text (English)
              <textarea rows={3} className={inputCls} value={form.subEn} onChange={(e) => setForm((f) => ({ ...f, subEn: e.target.value }))} placeholder="Leave blank to reuse the Indonesian text" />
            </label>
          </div>
        </div>
        <div className="block text-sm font-semibold">
          Hero image
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {form.imageUrl ? (
              <div className="h-24 w-40 overflow-hidden rounded-xl border border-[#173b3b]/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.imageUrl} alt={form.imageAlt || 'Hero preview'} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-24 w-40 items-center justify-center rounded-xl border border-dashed border-[#173b3b]/20 text-xs font-normal text-[#173b3b]/45">Placeholder in use</div>
            )}
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={state.phase === 'loading'} className="flex items-center gap-2 rounded-full border border-[#173b3b]/15 px-4 py-2 text-sm font-bold hover:bg-[#e4eee8] disabled:opacity-60">
                <ImagePlus size={15} /> Upload image
              </button>
              {form.imageUrl && (
                <button type="button" onClick={() => setForm((f) => ({ ...f, imageUrl: '' }))} className="flex items-center gap-2 rounded-full border border-[#173b3b]/15 px-4 py-2 text-sm font-bold text-[#a43d2b] hover:bg-[#f5d9d3]">
                  <Trash2 size={15} /> Use placeholder
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onFile} />
          </div>
          <label className="mt-3 block text-sm font-semibold">
            Image alt text (Indonesian — accessibility / SEO)
            <input className={inputCls} value={form.imageAlt} onChange={(e) => setForm((f) => ({ ...f, imageAlt: e.target.value }))} placeholder="e.g. Creator filming with a rented camera in Bali" />
          </label>
          <label className="mt-3 block text-sm font-semibold">
            Image alt text (English)
            <input className={inputCls} value={form.imageAltEn} onChange={(e) => setForm((f) => ({ ...f, imageAltEn: e.target.value }))} placeholder="Leave blank to reuse the Indonesian alt text" />
          </label>
        </div>
      </div>
      {state.phase === 'ok' && <p className="mt-4 text-sm font-semibold text-[#27604a]">{state.message}</p>}
      {state.phase === 'error' && <p role="alert" className="mt-4 text-sm font-semibold text-[#a43d2b]">{state.message}</p>}
      <button disabled={state.phase === 'loading'} className="mt-5 flex items-center gap-2 rounded-full bg-[#e76f51] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
        {state.phase === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save hero
      </button>
    </form>
  )
}