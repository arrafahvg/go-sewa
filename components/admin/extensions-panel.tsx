'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, Loader2 } from 'lucide-react'
import { extendBookingAction } from '@/app/actions/extensions'
import { formatMoney } from '@/lib/utils/money'

export type ExtensionRow = {
  id: string
  previousEndsAt: string
  newEndsAt: string
  additionalCents: number
  reason: string | null
  createdAt: string
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
const inputCls = 'mt-1 w-full rounded-lg border border-[#173b3b]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#387066]'

/**
 * Rental extension panel (spec §29): request a longer rental for this booking.
 * The server re-checks real availability over the new window before approving;
 * a conflicting period is refused with a clear message — never silently approved.
 */
export default function ExtensionsPanel({
  bookingId,
  currentEndsAt,
  extendable,
  extensions,
}: {
  bookingId: string
  currentEndsAt: string
  extendable: boolean
  extensions: ExtensionRow[]
}) {
  const router = useRouter()
  const [newEndsAt, setNewEndsAt] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!newEndsAt) { setError('Choose the new end date first.'); return }
    setBusy(true); setError(''); setSuccess('')
    const res = await extendBookingAction({ bookingId, newEndsAt, reason })
    setBusy(false)
    if (!res.ok) { setError(res.error ?? 'Something went wrong.'); return }
    setSuccess(`Extension approved — ${formatMoney(res.additionalCents ?? 0)} added to the booking total.`)
    setNewEndsAt(''); setReason('')
    router.refresh()
  }

  // Minimum selectable new end = day after the current endsAt (exclusive semantics).
  const minDate = new Date(new Date(currentEndsAt).getTime() + 86_400_000).toISOString().slice(0, 10)

  return (
    <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
      <h2 className="flex items-center gap-2 font-serif text-xl font-bold"><CalendarClock size={18} /> Rental extensions</h2>
      <p className="mt-1 text-xs text-[#173b3b]/55">
        Extend this booking&rsquo;s return date. Availability is checked against other
        bookings for the extra days before approval; conflicting requests are refused.
      </p>

      {extendable ? (
        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-end">
          <label className="block text-xs font-bold text-[#173b3b]/60">
            New end date
            <input type="date" min={minDate} value={newEndsAt} onChange={(e) => setNewEndsAt(e.target.value)} className={inputCls} required />
          </label>
          <label className="block text-xs font-bold text-[#173b3b]/60">
            Reason (optional)
            <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} placeholder="e.g. Customer extended their trip" />
          </label>
          <button disabled={busy} className="flex items-center justify-center gap-2 rounded-full bg-[#173b3b] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
            {busy && <Loader2 size={15} className="animate-spin" />} Check &amp; approve
          </button>
        </form>
      ) : (
        <p className="mt-4 rounded-xl border border-[#173b3b]/10 bg-[#faf8f2] px-4 py-3 text-xs font-semibold text-[#173b3b]/60">
          Extensions are only possible while the booking is in an active or reserved state.
        </p>
      )}

      {error && <p role="alert" className="mt-3 rounded-xl border border-[#e8a09a] bg-[#f5d9d3] px-4 py-3 text-sm font-semibold text-[#a43d2b]">{error}</p>}
      {success && <p role="status" aria-live="polite" className="mt-3 rounded-xl border border-[#8bc0a8] bg-[#e4eee8] px-4 py-3 text-sm font-semibold text-[#27604a]">{success}</p>}

      <div className="mt-5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">History</h3>
        {extensions.length === 0 ? (
          <p className="mt-2 text-xs text-[#173b3b]/50">No extensions recorded for this booking.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {extensions.map((x) => (
              <li key={x.id} className="rounded-xl border border-[#173b3b]/10 bg-[#faf8f2] px-4 py-3 text-xs">
                <p className="font-semibold">
                  {fmt(x.previousEndsAt)} → {fmt(x.newEndsAt)}
                  <span className="ml-2 font-bold text-[#27604a]">+{formatMoney(x.additionalCents)}</span>
                </p>
                <p className="mt-0.5 text-[#173b3b]/50">
                  Recorded {new Date(x.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  {x.reason ? ` — ${x.reason}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
