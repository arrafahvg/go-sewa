'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Printer } from 'lucide-react'
import { setAgreementStatusAction } from '@/app/actions/agreements'

export default function AgreementActions({ agreementId, status }: { agreementId: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function update(next: 'draft' | 'printed' | 'signed') {
    setBusy(true); setError(null)
    const res = await setAgreementStatusAction(agreementId, next)
    setBusy(false)
    if (!res.ok) setError(res.error)
    else router.refresh()
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <button onClick={() => window.print()} className="flex items-center gap-2 rounded-full bg-[#173b3b] px-5 py-2.5 text-sm font-bold text-white">
        <Printer size={15} /> Print / Save PDF
      </button>
      {status === 'draft' && (
        <>
          <button onClick={() => update('printed')} disabled={busy} className="rounded-full border border-[#173b3b]/20 px-5 py-2.5 text-sm font-bold hover:bg-[#e4eee8] disabled:opacity-50">
            Mark printed
          </button>
          <button onClick={() => update('signed')} disabled={busy} className="flex items-center gap-2 rounded-full bg-[#27604a] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {busy && <Loader2 size={15} className="animate-spin" />} Mark signed
          </button>
        </>
      )}
      {status !== 'draft' && (
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${status === 'signed' ? 'bg-[#e4eee8] text-[#27604a]' : 'bg-[#f0ecd0] text-[#7a6a2a]'}`}>{status}</span>
      )}
      {error && <span className="text-xs font-bold text-[#a43d2b]">{error}</span>}
    </div>
  )
}
