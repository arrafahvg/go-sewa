'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'
import { adjustBookingPricingAction } from '@/app/actions/operations'
import { formatMoney } from '@/lib/utils/money'

type Line = {
  id: string
  productName: string
  quantity: number
  unitPriceCents: number
  lineTotalCents: number
}

/**
 * Admin-reviewed pricing (spec §15). While an online order is pending /
 * awaiting confirmation, staff can adjust the delivery fee and per-line unit
 * prices; totals are recalculated server-side and amounts freeze afterwards.
 */
export default function PricingAdjustPanel({
  bookingId, status, deliveryFeeCents, lines,
}: {
  bookingId: string
  status: string
  deliveryFeeCents: number
  lines: Line[]
}) {
  const router = useRouter()
  const editable = status === 'pending' || status === 'awaiting_confirmation'
  const [fee, setFee] = useState(String(Math.round(deliveryFeeCents / 100)))
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(lines.map((l) => [l.id, String(Math.round(l.unitPriceCents / 100))])),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [okMsg, setOkMsg] = useState('')

  if (!editable) {
    return (
      <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
        <h2 className="font-bold">Pricing</h2>
        <p className="mt-2 text-sm text-[#173b3b]/60">
          Amounts are locked once an order leaves review (current status: <strong>{status.replace(/_/g, ' ')}</strong>).
          Delivery fee currently {formatMoney(deliveryFeeCents)}.
        </p>
      </div>
    )
  }

  const inputCls = 'mt-1 w-full rounded-lg border border-[#173b3b]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#387066]'

  async function save() {
    setBusy(true); setError(''); setOkMsg('')
    const res = await adjustBookingPricingAction({
      bookingId,
      deliveryFeeCents: Math.round(Number(fee || '0') * 100),
      lines: lines.map((l) => ({ itemId: l.id, unitPriceCents: Math.round(Number(prices[l.id] ?? '0') * 100) })),
    })
    setBusy(false)
    if (res.ok) { setOkMsg('Pricing updated.'); router.refresh() }
    else setError(res.error)
  }

  return (
    <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
      <h2 className="font-bold">Adjust pricing <span className="ml-2 rounded-full bg-[#f0ecd0] px-2.5 py-1 text-[11px] font-bold text-[#7a6a2a]">order in review</span></h2>
      <p className="mt-2 text-xs text-[#173b3b]/55">
        The checkout total was an estimate. Set the final delivery fee and per-day prices here — the customer is told the final amount when you confirm via WhatsApp.
      </p>

      <div className="mt-4 space-y-3">
        {lines.map((l) => (
          <div key={l.id} className="flex flex-wrap items-end justify-between gap-3 rounded-xl bg-[#f7f5ef] px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-bold">{l.productName} × {l.quantity}</p>
              <p className="text-xs text-[#173b3b]/55">Current line total {formatMoney(l.lineTotalCents)}</p>
            </div>
            <label className="w-40 text-xs font-bold text-[#173b3b]/55">
              Price / day (Rp)
              <input
                type="number" min={0}
                value={prices[l.id] ?? ''}
                onChange={(e) => setPrices((p) => ({ ...p, [l.id]: e.target.value }))}
                className={inputCls}
              />
            </label>
          </div>
        ))}
        <label className="block w-full sm:w-56 text-xs font-bold text-[#173b3b]/55">
          Delivery fee (Rp)
          <input type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} className={inputCls} />
        </label>
      </div>

      {okMsg && <p className="mt-3 text-sm font-semibold text-[#27604a]">{okMsg}</p>}
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-[#a43d2b]">{error}</p>}

      <button onClick={save} disabled={busy} className="mt-4 flex items-center gap-2 rounded-full bg-[#e76f51] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {busy ? 'Saving…' : 'Save pricing'}
      </button>
    </div>
  )
}