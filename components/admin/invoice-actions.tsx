'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Printer } from 'lucide-react'
import { setInvoiceStatusAction } from '@/app/actions/invoices'

export default function InvoiceActions({ invoiceId, status }: { invoiceId: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function update(next: 'unpaid' | 'paid' | 'void') {
    setBusy(true); setError(null)
    const res = await setInvoiceStatusAction(invoiceId, next)
    setBusy(false)
    if (!res.ok) setError(res.error)
    else router.refresh()
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <button onClick={() => window.print()} className="flex items-center gap-2 rounded-full bg-[#173b3b] px-5 py-2.5 text-sm font-bold text-white">
        <Printer size={15} /> Print / Save PDF
      </button>
      {status !== 'paid' && (
        <button onClick={() => update('paid')} disabled={busy} className="flex items-center gap-2 rounded-full bg-[#27604a] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {busy && <Loader2 size={15} className="animate-spin" />} Mark paid
        </button>
      )}
      {status !== 'void' && (
        <button onClick={() => update('void')} disabled={busy} className="rounded-full border border-[#a43d2b]/40 px-5 py-2.5 text-sm font-bold text-[#a43d2b] hover:bg-[#f5d9d3] disabled:opacity-50">
          Void
        </button>
      )}
      {error && <span className="text-xs font-bold text-[#a43d2b]">{error}</span>}
    </div>
  )
}
