'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, Loader2 } from 'lucide-react'
import { generateInvoiceAction } from '@/app/actions/invoices'

/**
 * "Generate invoice" (§35, §80): really creates an invoice record from the
 * booking's stored snapshots, then links to the printable document.
 * Re-generating returns the existing open invoice instead of duplicating.
 */
export default function GenerateInvoiceButton({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [existed, setExisted] = useState(false)

  async function generate() {
    setBusy(true); setError(null)
    const res = await generateInvoiceAction(bookingId)
    setBusy(false)
    if (!res.ok) { setError(res.error); return }
    setInvoiceId(res.invoiceId)
    setExisted(res.alreadyExisted)
    router.refresh()
  }

  return (
    <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold"><FileText size={15} /> Invoice</p>
          <p className="mt-1 text-xs text-[#173b3b]/55">Generated from this booking&apos;s stored pricing snapshot — later price changes never affect it.</p>
        </div>
        <button onClick={generate} disabled={busy} className="flex items-center gap-2 rounded-full bg-[#173b3b] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
          {busy && <Loader2 size={15} className="animate-spin" />} Generate invoice
        </button>
      </div>
      {error && <p className="mt-3 text-sm font-bold text-[#a43d2b]">{error}</p>}
      {invoiceId && (
        <p className="mt-3 text-sm">
          <Link href={`/admin/invoices/${invoiceId}`} className="font-bold text-[#387066] hover:underline">Open invoice →</Link>
          {existed && <span className="ml-2 text-xs text-[#173b3b]/55">(an open invoice already existed for this booking)</span>}
        </p>
      )}
    </div>
  )
}
