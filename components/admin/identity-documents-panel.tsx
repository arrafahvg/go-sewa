'use client'

import { useState } from 'react'
import { Check, ExternalLink, Loader2, ShieldCheck } from 'lucide-react'
import {
  getIdentityDocumentUrlAction, verifyIdentityDocumentAction,
} from '@/app/actions/documents'

/**
 * Staff-only review of the customer's uploaded identity document (KTP / SIM).
 * The file lives in a private Supabase bucket — staff open it through a
 * short-lived signed URL; verification is audit-logged (§63).
 */
export default function IdentityDocumentsPanel({ docs }: { docs: { id: string; kind: string; createdAt: string; verified: boolean; customerId: string }[] }) {
  const [busy, setBusy] = useState('')
  const [verified, setVerified] = useState(docs.some((d) => d.verified))
  const [error, setError] = useState('')

  if (docs.length === 0) return null

  const open = async (id: string) => {
    setBusy(id); setError('')
    const res = await getIdentityDocumentUrlAction(id)
    setBusy('')
    if (!res.ok) { setError(res.error); return }
    window.open(res.url, '_blank', 'noopener')
  }

  const verify = async () => {
    setBusy('verify'); setError('')
    const res = await verifyIdentityDocumentAction(docs[0].customerId)
    setBusy('')
    if (!res.ok) { setError(res.error); return }
    setVerified(true)
  }

  const label = (kind: string) => {
    const [, type, num] = kind.split(':')
    const name = type === 'ktp' ? 'KTP' : type === 'sim' ? "SIM (driver's licence)" : type === 'passport' ? 'Passport' : 'ID'
    return num ? `${name} · ${num}` : name
  }

  return (
    <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
      <h2 className="flex items-center gap-2 font-bold"><ShieldCheck size={17} /> Identity document (collateral)</h2>
      <ul className="mt-4 space-y-2 text-sm">
        {docs.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f7f5ef] px-4 py-3">
            <span className="font-semibold">{label(d.kind)} <span className="text-xs font-normal text-[#173b3b]/50">· uploaded {new Date(d.createdAt).toLocaleString()}</span></span>
            <button onClick={() => open(d.id)} disabled={busy !== ''}
              className="flex items-center gap-1 rounded-full border border-[#173b3b]/15 px-3 py-1.5 text-xs font-bold hover:bg-[#e4eee8]">
              {busy === d.id ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />} View
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-3">
        {verified ? (
          <span className="flex items-center gap-1 rounded-full bg-[#e4eee8] px-3 py-1.5 text-xs font-bold text-[#27604a]"><Check size={13} /> Identity verified</span>
        ) : (
          <button onClick={verify} disabled={busy !== ''} className="flex items-center gap-1 rounded-full bg-[#173b3b] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {busy === 'verify' && <Loader2 size={13} className="animate-spin" />} Mark identity verified
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-[#a43d2b]">{error}</p>}
    </div>
  )
}
