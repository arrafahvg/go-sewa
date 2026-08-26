'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { updateSettingsAction, uploadLogoAction, removeLogoAction, uploadQrisAction, removeQrisAction, uploadFaviconAction, removeFaviconAction } from '@/app/actions/settings'

type Props = {
  /** Current settings values keyed by setting key. */
  initial: Record<string, string>
}

type BankAccount = { bankName: string; accountNumber: string; accountHolder: string }

function parseAccounts(raw: string | undefined): BankAccount[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((a): a is Record<string, unknown> => !!a && typeof a === 'object')
      .map((a) => ({
        bankName: String(a.bankName ?? ''),
        accountNumber: String(a.accountNumber ?? ''),
        accountHolder: String(a.accountHolder ?? ''),
      }))
  } catch {
    return []
  }
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
  const [accounts, setAccounts] = useState<BankAccount[]>(() => {
    const parsed = parseAccounts(initial['payment_bank_accounts'])
    return parsed.length ? parsed : []
  })
  const [qrisUrl, setQrisUrl] = useState(initial['payment_qris_image_url'] ?? '')
  const [faviconUrl, setFaviconUrl] = useState(initial['favicon_url'] ?? '/favicon.svg')
  const [state, setState] = useState<{ phase: 'idle' | 'loading' | 'ok' | 'error'; message?: string }>({ phase: 'idle' })
  const fileRef = useRef<HTMLInputElement>(null)
  const qrisFileRef = useRef<HTMLInputElement>(null)
  const faviconFileRef = useRef<HTMLInputElement>(null)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState({ phase: 'loading' })
    // Drop fully-empty bank account rows before persisting.
    const cleanAccounts = accounts.filter((a) => a.bankName.trim() || a.accountNumber.trim())
    const patch = {
      ...values,
      logo_url: logoUrl,
      favicon_url: faviconUrl,
      payment_bank_accounts: JSON.stringify(cleanAccounts),
    }
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

  async function onQrisFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setState({ phase: 'error', message: 'Only PNG, JPG or WebP images are accepted.' }); return }
    setState({ phase: 'loading' })
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = String(reader.result)
      const base64 = dataUrl.split(',')[1] ?? ''
      const res = await uploadQrisAction({ fileBase64: base64, mimeType: file.type })
      if (res.ok && res.url) { setQrisUrl(res.url); setState({ phase: 'ok', message: 'QRIS image uploaded.' }) }
      else if (!res.ok) setState({ phase: 'error', message: res.error })
      else setState({ phase: 'error', message: 'QRIS uploaded but no URL was returned.' })
    }
    reader.onerror = () => setState({ phase: 'error', message: 'Could not read the file.' })
    reader.readAsDataURL(file)
    if (qrisFileRef.current) qrisFileRef.current.value = ''
  }

  async function removeQris() {
    setState({ phase: 'loading' })
    const res = await removeQrisAction()
    if (res.ok) { setQrisUrl(''); setState({ phase: 'ok', message: 'QRIS image removed.' }) }
    else setState({ phase: 'error', message: res.error })
  }

  async function onFaviconFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'].includes(file.type)) { setState({ phase: 'error', message: 'Only PNG, JPG, WebP, SVG or GIF images are accepted.' }); return }
    setState({ phase: 'loading' })
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = String(reader.result)
      const base64 = dataUrl.split(',')[1] ?? ''
      const res = await uploadFaviconAction({ fileBase64: base64, mimeType: file.type })
      if (res.ok && res.url) { setFaviconUrl(res.url); setState({ phase: 'ok', message: 'Favicon uploaded.' }) }
      else if (!res.ok) setState({ phase: 'error', message: res.error })
      else setState({ phase: 'error', message: 'Favicon uploaded but no URL was returned.' })
    }
    reader.onerror = () => setState({ phase: 'error', message: 'Could not read the file.' })
    reader.readAsDataURL(file)
    if (faviconFileRef.current) faviconFileRef.current.value = ''
  }

  async function removeFavicon() {
    setState({ phase: 'loading' })
    const res = await removeFaviconAction()
    if (res.ok) { setFaviconUrl('/favicon.svg'); setState({ phase: 'ok', message: 'Favicon reset to the bundled default.' }) }
    else setState({ phase: 'error', message: res.error })
  }
  function updateAccount(index: number, patch: Partial<BankAccount>) {
    setAccounts((list) => list.map((a, i) => (i === index ? { ...a, ...patch } : a)))
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

        {/* Managed browser favicon (§42) — rendered by the root layout */}
        <div className="mt-5 rounded-xl border border-dashed border-[#173b3b]/20 bg-[#faf8f2] p-5">
          <p className="text-sm font-semibold">Browser icon (favicon)</p>
          <p className="mt-1 text-xs text-[#173b3b]/55">Shown on the browser tab. Falls back to the bundled icon when removed.</p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-[#173b3b]/10 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={faviconUrl} alt="Favicon" className="h-10 w-10 object-contain" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => faviconFileRef.current?.click()} className="flex items-center gap-2 rounded-full bg-[#173b3b] px-4 py-2 text-sm font-bold text-white">
                <ImagePlus size={15} /> Upload favicon
              </button>
              <input ref={faviconFileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" className="hidden" onChange={onFaviconFile} />
              <button type="button" onClick={removeFavicon} className="flex items-center gap-2 rounded-full border border-[#173b3b]/15 px-4 py-2 text-sm font-bold text-[#a43d2b] hover:bg-[#f5d9d3]">
                <Trash2 size={15} /> Reset to default
              </button>
            </div>
          </div>
          <label className="mt-4 block text-sm font-semibold">
            Or favicon URL
            <input
              type="url"
              value={faviconUrl}
              onChange={(e) => setFaviconUrl(e.target.value)}
              placeholder="/favicon.svg"
              className="mt-2 w-full rounded-xl border border-[#173b3b]/15 bg-transparent px-4 py-3 font-normal outline-none focus:border-[#e76f51]"
            />
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

        {/* Manual payment details (§16) — bank transfer accounts + QRIS for invoices */}
        <div className="mt-5 rounded-xl border border-dashed border-[#173b3b]/20 bg-[#faf8f2] p-5">
          <p className="text-sm font-semibold">Payment details (bank transfer &amp; QRIS)</p>
          <p className="mt-1 text-xs font-normal text-[#173b3b]/50">
            Shown on invoices and customer share links. Leave empty to hide the block.
          </p>

          <div className="mt-4 space-y-4">
            {accounts.map((a, i) => (
              <div key={i} className="rounded-xl border border-[#173b3b]/10 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">Bank account {i + 1}</p>
                  <button type="button" onClick={() => setAccounts((list) => list.filter((_, j) => j !== i))} className="flex items-center gap-1 text-xs font-bold text-[#a43d2b] hover:underline">
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="block text-xs font-semibold">
                    Bank name
                    <input value={a.bankName} onChange={(e) => updateAccount(i, { bankName: e.target.value })} placeholder="BCA" className="mt-1 w-full rounded-lg border border-[#173b3b]/15 bg-transparent px-3 py-2 font-normal outline-none focus:border-[#e76f51]" />
                  </label>
                  <label className="block text-xs font-semibold">
                    Account number
                    <input value={a.accountNumber} onChange={(e) => updateAccount(i, { accountNumber: e.target.value })} placeholder="1234567890" className="mt-1 w-full rounded-lg border border-[#173b3b]/15 bg-transparent px-3 py-2 font-normal outline-none focus:border-[#e76f51]" />
                  </label>
                  <label className="block text-xs font-semibold">
                    Account holder
                    <input value={a.accountHolder} onChange={(e) => updateAccount(i, { accountHolder: e.target.value })} placeholder="PT Go-Sewa Bali" className="mt-1 w-full rounded-lg border border-[#173b3b]/15 bg-transparent px-3 py-2 font-normal outline-none focus:border-[#e76f51]" />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={() => setAccounts((list) => [...list, { bankName: '', accountNumber: '', accountHolder: '' }])} className="mt-3 flex items-center gap-2 rounded-full border border-[#173b3b]/15 bg-white px-4 py-2 text-sm font-bold hover:bg-[#e4eee8]">
            <Plus size={15} /> Add bank account
          </button>

          {/* QRIS image */}
          <div className="mt-5 flex flex-wrap items-center gap-4">
            {qrisUrl
              ? (
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border border-[#173b3b]/10 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrisUrl} alt="QRIS" className="h-24 w-24 object-contain" />
                </div>
              )
              : <div className="flex h-14 items-center rounded-xl bg-[#e4eee8] px-4 text-xs font-bold text-[#173b3b]/45">No QRIS image set</div>}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => qrisFileRef.current?.click()} className="flex items-center gap-2 rounded-full bg-[#173b3b] px-4 py-2 text-sm font-bold text-white">
                <ImagePlus size={15} /> Upload QRIS image
              </button>
              <input ref={qrisFileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onQrisFile} />
              {qrisUrl && (
                <button type="button" onClick={removeQris} className="flex items-center gap-2 rounded-full border border-[#173b3b]/15 px-4 py-2 text-sm font-bold text-[#a43d2b] hover:bg-[#f5d9d3]">
                  <Trash2 size={15} /> Remove
                </button>
              )}
            </div>
          </div>

          <label className="mt-4 block text-sm font-semibold">
            Payment instructions
            <textarea
              rows={3}
              value={values['payment_instructions'] ?? ''}
              onChange={(ev) => setValues((v) => ({ ...v, payment_instructions: ev.target.value }))}
              placeholder="Please send your transfer proof via WhatsApp after payment."
              className="mt-2 w-full rounded-xl border border-[#173b3b]/15 bg-transparent px-4 py-3 font-normal outline-none focus:border-[#e76f51]"
            />
            <span className="mt-1 block text-xs font-normal text-[#173b3b]/50">Optional note printed under the bank accounts / QRIS on every invoice.</span>
          </label>
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