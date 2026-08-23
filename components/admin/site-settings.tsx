'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Save, Trash2 } from 'lucide-react'
import { updateSettingsAction, uploadLogoAction, removeLogoAction } from '@/app/actions/settings'

type Props = {
  /** Current settings values keyed by setting key. */
  initial: Record<string, string>
}

type Field = {
  key: string
  label: string
  hint?: string
  type?: 'text' | 'url' | 'tel' | 'email'
  placeholder?: string
}

const FIELDS: Field[] = [
  { key: 'business_name', label: 'Business name', placeholder: 'Go-Sewa' },
  { key: 'business_email', label: 'Business email', type: 'email', placeholder: 'hello@gosewa.id' },
  { key: 'phone_number', label: 'Phone (display)', type: 'tel', placeholder: '+62 812 3456 7890' },
  { key: 'whatsapp_number', label: 'WhatsApp number', type: 'tel', placeholder: '628123456789', hint: 'Digits only, no + or spaces. Used for the floating WhatsApp CTA.' },
  { key: 'business_address', label: 'Business address', placeholder: 'Jl. Raya Seminyak No. 12, Bali, Indonesia' },
  { key: 'maps_url', label: 'Google Maps URL', placeholder: 'https://maps.google.com/...' },
  { key: 'instagram_url', label: 'Instagram URL', placeholder: 'https://instagram.com/gosewa' },
  { key: 'footer_text', label: 'Footer tagline', placeholder: 'Better gear for better stories.' },
]

export default function SiteSettingsForm({ initial }: Props) {
  const [values, setValues] = useState<Record<string, string>>({ ...initial })
  const [logoUrl, setLogoUrl] = useState(initial['logo_url'] ?? '')
  const [state, setState] = useState<{ phase: 'idle' | 'loading' | 'ok' | 'error'; message?: string }>({ phase: 'idle' })
  const fileRef = useRef<HTMLInputElement>(null)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState({ phase: 'loading' })
    const patch = { ...values, logo_url: logoUrl }
    const res = await updateSettingsAction(patch)
    if (res.ok) setState({ phase: 'ok', message: 'Settings saved.' })
    else setState({ phase: 'error', message: res.error })
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setState({ phase: 'error', message: 'Only image files are accepted.' }); return }
    setState({ phase: 'loading' })
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = String(reader.result)
      const base64 = dataUrl.split(',')[1] ?? ''
      const res = await uploadLogoAction({ fileBase64: base64, mimeType: file.type })
      if (res.ok && res.url) { setLogoUrl(res.url); setState({ phase: 'ok', message: 'Logo uploaded.' }) }
      else if (!res.ok) setState({ phase: 'error', message: res.error })
      else setState({ phase: 'error', message: 'Logo uploaded but no URL was returned.' })
    }
    reader.onerror = () => setState({ phase: 'error', message: 'Could not read the file.' })
    reader.readAsDataURL(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function remove() {
    setState({ phase: 'loading' })
    const res = await removeLogoAction()
    if (res.ok) { setLogoUrl(''); setState({ phase: 'ok', message: 'Logo removed.' }) }
    else setState({ phase: 'error', message: res.error })
  }

  return (
    <form onSubmit={submit} className="mt-6 max-w-2xl">
      <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
        <h2 className="font-serif text-xl font-bold">Company profile</h2>
        <p className="mt-1 text-xs text-[#173b3b]/55">
          These details power the storefront header, footer and the floating WhatsApp button. Changes apply immediately.
        </p>

        {/* Managed logo upload */}
        <div className="mt-5 rounded-xl border border-dashed border-[#173b3b]/20 bg-[#faf8f2] p-5">
          <p className="text-sm font-semibold">Logo</p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {logoUrl
              ? (
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-[#173b3b]/10 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="Logo" className="h-11 w-11 object-contain" />
                </div>
              )
              : <div className="flex h-14 items-center rounded-xl bg-[#e4eee8] px-4 text-xs font-bold text-[#173b3b]/45">No logo set</div>}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-full bg-[#173b3b] px-4 py-2 text-sm font-bold text-white">
                <ImagePlus size={15} /> Upload logo
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" className="hidden" onChange={onFile} />
              {logoUrl && (
                <button type="button" onClick={remove} className="flex items-center gap-2 rounded-full border border-[#173b3b]/15 px-4 py-2 text-sm font-bold text-[#a43d2b] hover:bg-[#f5d9d3]">
                  <Trash2 size={15} /> Remove
                </button>
              )}
            </div>
          </div>
          <label className="mt-4 block text-sm font-semibold">
            Or logo URL
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="/uploads/logo.png"
              className="mt-2 w-full rounded-xl border border-[#173b3b]/15 bg-transparent px-4 py-3 font-normal outline-none focus:border-[#e76f51]"
            />
            <span className="mt-1 block text-xs font-normal text-[#173b3b]/50">You can upload a file or paste a public URL.</span>
          </label>
        </div>

        <div className="mt-5 grid gap-4">
          {FIELDS.map((f) => (
            <label key={f.key} className="block text-sm font-semibold">
              {f.label}
              <input
                type={f.type ?? 'text'}
                value={values[f.key] ?? ''}
                onChange={(ev) => setValues((v) => ({ ...v, [f.key]: ev.target.value }))}
                placeholder={f.placeholder}
                className="mt-2 w-full rounded-xl border border-[#173b3b]/15 bg-transparent px-4 py-3 font-normal outline-none focus:border-[#e76f51]"
              />
              {f.hint && <span className="mt-1 block text-xs font-normal text-[#173b3b]/50">{f.hint}</span>}
            </label>
          ))}
        </div>

        {state.phase === 'ok' && <p className="mt-4 text-sm font-semibold text-[#27604a]">{state.message}</p>}
        {state.phase === 'error' && <p role="alert" className="mt-4 text-sm font-semibold text-[#a43d2b]">{state.message}</p>}

        <button
          disabled={state.phase === 'loading'}
          className="mt-6 flex items-center gap-2 rounded-full bg-[#e76f51] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {state.phase === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {state.phase === 'loading' ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </form>
  )
}