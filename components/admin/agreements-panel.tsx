'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileSignature, Loader2 } from 'lucide-react'
import { generateAgreementAction } from '@/app/actions/agreements'

/**
 * "Generate rental agreement" (§21, §80): really renders the agreement from
 * the booking snapshot + active template and stores it; links to the
 * printable/signature-ready document.
 */
export default function AgreementsPanel({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agreementId, setAgreementId] = useState<string | null>(null)
  const [existed, setExisted] = useState(false)

  async function generate() {
    setBusy(true); setError(null)
    const res = await generateAgreementAction(bookingId)
    setBusy(false)
    if (!res.ok) { setError(res.error); return }
    setAgreementId(res.agreementId)
    setExisted(res.alreadyExisted)
    router.refresh()
  }

  return (
    <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold"><FileSignature size={15} /> Rental agreement</p>
          <p className="mt-1 text-xs text-[#173b3b]/55">Merged from this booking&apos;s stored data and the active template — ready to print for signature.</p>
        </div>
        <button onClick={generate} disabled={busy} className="flex items-center gap-2 rounded-full bg-[#173b3b] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
          {busy && <Loader2 size={15} className="animate-spin" />} Generate agreement
        </button>
      </div>
      {error && <p className="mt-3 text-sm font-bold text-[#a43d2b]">{error}</p>}
      {agreementId && (
        <p className="mt-3 text-sm">
          <Link href={`/admin/agreements/${agreementId}`} className="font-bold text-[#387066] hover:underline">Open agreement →</Link>
          {existed && <span className="ml-2 text-xs text-[#173b3b]/55">(existing draft re-rendered with the current template)</span>}
        </p>
      )}
    </div>
  )
}
