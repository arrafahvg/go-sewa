'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CreditCard, Loader2, RotateCcw, Save } from 'lucide-react'
import { updateInvoicePaymentAction } from '@/app/actions/invoices'
import type { PaymentDetails } from '@/lib/services/settings'

type Props = {
  invoiceId: string
  /** Staff-configured defaults (from settings §73). */
  configured: PaymentDetails
  /** Details currently rendered on this invoice (override merged over defaults). */
  current: PaymentDetails
  /** Whether this invoice currently stores an explicit override. */
  hasOverride: boolean
}

/**
 * Inline editor for the per-invoice manual-payment override (§16) on the admin
 * invoice detail page. Works for both manual and booking-generated invoices.
 * Sends selections only — the server re-reads account data from settings (§6).
 */
export default function InvoicePaymentEditor({ invoiceId, configured, current, hasOverride }: Props) {
  const router = useRouter()
  const [useDefaults, setUseDefaults] = useState(!hasOverride)
  const keyOf = (a: PaymentDetails['accounts'][number]) => `${a.bankName}|${a.accountNumber}|${a.accountHolder}`
  const indexByKey = new Map(configured.accounts.map((a, i) => [keyOf(a), i]))
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>(() =>
    hasOverride
      ? current.accounts.map((a) => indexByKey.get(keyOf(a))).filter((i): i is number => i != null)
      : configured.accounts.map((_, i) => i),
  )
  const [includeQris, setIncludeQris] = useState(!!current.qrisImageUrl)
  const [instructions, setInstructions] = useState(current.instructions)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function save(useDefault: boolean) {
    setBusy(true); setError(''); setSaved(false)
    const res = await updateInvoicePaymentAction({
      invoiceId,
      payment: useDefault ? null : {
        accountIndexes: selectedAccounts,
        includeQris,
        instructions: instructions || null,
      },
    })
    setBusy(false)
    if (!res.ok) { setError(res.error); return }
    setSaved(true)
    router.refresh()
  }

  return (
    <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-6 print:hidden">
      <h2 className="flex items-center gap-2 font-bold"><CreditCard size={18} /> Payment details on this invoice</h2>

      <label className="mt-4 flex items-center gap-2 text-sm font-bold text-[#173b3b]/70">
        <input
          type="checkbox"
          checked={useDefaults}
          onChange={(e) => setUseDefaults(e.target.checked)}
          disabled={busy}
          className="h-4 w-4 accent-[#e76f51]"
        />
        Use company settings ({configured.accounts.length} bank account{configured.accounts.length === 1 ? '' : 's'}{configured.qrisImageUrl ? ' + QRIS' : ''})
      </label>
      {!useDefaults && (
        <div className="mt-4 space-y-3">
          {configured.accounts.length > 0 ? (
            <div className="space-y-1.5">
              {configured.accounts.map((a, i) => (
                <label key={i} className="flex items-center gap-2 text-xs font-semibold text-[#173b3b]/70">
                  <input
                    type="checkbox"
                    checked={selectedAccounts.includes(i)}
                    onChange={(e) =>
                      setSelectedAccounts((prev) => (e.target.checked ? [...prev, i] : prev.filter((j) => j !== i)))
                    }
                    disabled={busy}
                    className="h-3.5 w-3.5 accent-[#e76f51]"
                  />
                  {a.bankName || 'Bank'} · <span className="font-mono">{a.accountNumber || '—'}</span>
                  {a.accountHolder && <span className="font-normal text-[#173b3b]/50">({a.accountHolder})</span>}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#173b3b]/45">No bank accounts configured — add them at Admin → Settings.</p>
          )}

          {configured.qrisImageUrl && (
            <label className="flex items-center gap-2 text-xs font-semibold text-[#173b3b]/70">
              <input
                type="checkbox"
                checked={includeQris}
                onChange={(e) => setIncludeQris(e.target.checked)}
                disabled={busy}
                className="h-3.5 w-3.5 accent-[#e76f51]"
              />
              Include QRIS image
            </label>
          )}

          <label className="block text-xs font-bold text-[#173b3b]/60">
            Payment instructions
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Optional note printed on this invoice only."
              disabled={busy}
              className="mt-1 w-full rounded-xl border border-[#173b3b]/12 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#e76f51]"
            />
          </label>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => save(useDefaults)}
          disabled={busy}
          className="flex items-center gap-2 rounded-full bg-[#173b3b] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save payment details
        </button>
        {(hasOverride || !useDefaults) && (
          <button
            onClick={() => { setUseDefaults(true); save(true) }}
            disabled={busy}
            className="flex items-center gap-2 rounded-full border border-[#173b3b]/15 px-4 py-2.5 text-sm font-bold hover:bg-[#e4eee8] disabled:opacity-60"
          >
            <RotateCcw size={15} /> Reset to company settings
          </button>
        )}
      </div>

      {saved && <p className="mt-3 flex items-center gap-1 text-sm font-bold text-[#27604a]"><Check size={15} /> Saved — the invoice and its share link now show these details.</p>}
      {error && <p role="alert" className="mt-3 text-sm font-bold text-[#a43d2b]">{error}</p>}
    </div>
  )
}

