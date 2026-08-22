'use client'

import { useRef, useState } from 'react'
import { Camera, Check, Loader2 } from 'lucide-react'
import { uploadIdentityDocumentAction } from '@/app/actions/documents'

/**
 * Identity document (KTP / SIM) capture + upload — the collateral required for a
 * rental (spec §19). Real upload to the private Supabase Storage bucket via a
 * server action; the returned document id is required by the booking actions.
 */
export default function IdentityDocumentUpload({
  customerName, customerPhone, onUploaded,
}: {
  customerName: string
  customerPhone?: string
  onUploaded: (result: { documentId: string; customerId: string }) => void
}) {
  const [idType, setIdType] = useState<'ktp' | 'sim'>('ktp')
  const [idNumber, setIdNumber] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<{ base64: string; mimeType: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ documentId: string; customerId: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const pick = (f: File | null) => {
    setError('')
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { setError('Photo must be under 5 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      setPreview(dataUrl)
      setFile({ base64: dataUrl.split(',')[1] ?? '', mimeType: f.type || 'image/jpeg' })
      setDone(null)
    }
    reader.readAsDataURL(f)
  }

  const upload = async () => {
    if (!idNumber.trim()) { setError('Enter the ID number.'); return }
    if (!file) { setError('Take or choose a photo of the document first.'); return }
    setBusy(true); setError('')
    const res = await uploadIdentityDocumentAction({
      customerName, customerPhone,
      idType, idNumber: idNumber.trim(),
      fileBase64: file.base64, mimeType: file.mimeType,
    })
    setBusy(false)
    if (!res.ok) { setError(res.error); return }
    setDone({ documentId: res.documentId, customerId: res.customerId })
    onUploaded({ documentId: res.documentId, customerId: res.customerId })
  }

  const inputCls = 'mt-2 w-full rounded-xl border border-[#173b3b]/12 bg-[#f7f5ef] px-4 py-3 text-sm font-semibold outline-none focus:border-[#e76f51]'

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold">Identity document (guarantee)</h2>
      <p className="mt-1 text-xs text-[#173b3b]/55">
        A photo of your KTP or driver&apos;s licence is required as rental collateral.
        It is stored securely and only visible to our staff.
      </p>
      <div className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-bold text-[#173b3b]/55">Document type
            <select value={idType} onChange={(e) => setIdType(e.target.value as 'ktp' | 'sim')} className={inputCls}>
              <option value="ktp">KTP (ID card)</option>
              <option value="sim">SIM (Driver&apos;s licence)</option>
            </select>
          </label>
          <label className="block text-xs font-bold text-[#173b3b]/55">ID number
            <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className={inputCls} placeholder="Document number" />
          </label>
        </div>

        <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)} />

        {done ? (
          <div className="flex items-center gap-2 rounded-xl border border-[#8bc0a8] bg-[#e4eee8] px-4 py-3 text-sm font-bold text-[#27604a]">
            <Check size={16} /> Document uploaded securely. You can submit your booking.
          </div>
        ) : (
          <>
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Identity document preview" className="max-h-48 rounded-xl border border-[#173b3b]/10" />
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => inputRef.current?.click()}
                className="flex items-center gap-2 rounded-full border border-[#173b3b]/15 px-4 py-2 text-xs font-bold hover:bg-[#e4eee8]">
                <Camera size={14} /> {preview ? 'Retake / change photo' : 'Take / choose photo'}
              </button>
              <button type="button" onClick={upload} disabled={busy}
                className="flex items-center gap-2 rounded-full bg-[#173b3b] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                {busy && <Loader2 size={14} className="animate-spin" />} Upload document
              </button>
            </div>
          </>
        )}
        {error && <p className="text-sm font-semibold text-[#a43d2b]">{error}</p>}
      </div>
    </div>
  )
}
