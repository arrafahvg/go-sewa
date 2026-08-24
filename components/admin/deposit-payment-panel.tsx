'use client'

import { useState } from 'react'
import { Banknote, CircleDollarSign, Loader2, Shield } from 'lucide-react'
import { formatMoney, rupiahToCents, centsToRupiah } from '@/lib/utils/money'
import { recordDepositAction } from '@/app/actions/deposits'
import { recordPaymentAction } from '@/app/actions/payments'

type DepositTxn = { id: string; kind: string; amountCents: number; note: string | null; createdAt: string }
type Payment = { id: string; method: string; amountCents: number; reference: string | null; receivedAt: string }

const DEPOSIT_TONE: Record<string, string> = {
  held: 'bg-[#e4eee8] text-[#27604a]',
  returned: 'bg-[#e0e3e0] text-[#4d6b62]',
  forfeited: 'bg-[#f5d9d3] text-[#a43d2b]',
  partially_returned: 'bg-[#f0ecd0] text-[#7a6a2a]',
  partially_forfeited: 'bg-[#f0ecd0] text-[#7a6a2a]',
  pending: 'bg-[#f0ecd0] text-[#7a6a2a]',
  not_required: 'bg-[#e0e3e0] text-[#4d6b62]',
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash', transfer: 'Transfer', qris: 'QRIS', ewallet: 'E-wallet', gateway: 'Gateway', other: 'Other',
}

export default function DepositPaymentPanel({
  bookingId, number, totalCents, depositCents, depositStatus,
  depositHistory, payments, paidCents,
}: {
  bookingId: string
  number: string
  totalCents: number
  depositCents: number
  depositStatus: string | null
  depositHistory: DepositTxn[]
  payments: Payment[]
  paidCents: number
}) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [txnAmount, setTxnAmount] = useState(`${centsToRupiah(Math.max(0, depositCents)) || ''}`)
  const [payMethod, setPayMethod] = useState('cash')
  const [payAmount, setPayAmount] = useState(`${centsToRupiah(Math.max(0, totalCents - paidCents))}`)

  const run = async (key: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(key); setError('')
    const res = await fn()
    setBusy('')
    if (!res.ok) setError(res.error ?? 'Operation failed.')
  }

  const depositTone = DEPOSIT_TONE[depositStatus ?? 'pending'] ?? DEPOSIT_TONE.pending
  const returnedCents = depositHistory.filter((t) => t.kind === 'returned').reduce((s, t) => s + t.amountCents, 0)
  const forfeitedCents = depositHistory.filter((t) => t.kind === 'forfeited').reduce((s, t) => s + t.amountCents, 0)
  const remainingDeposit = depositCents - returnedCents - forfeitedCents

  return (
    <div className="grid gap-4 print:hidden">
      <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
        <h2 className="flex items-center gap-2 font-bold"><Shield size={17} /> Deposit</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="font-serif text-2xl font-bold">{formatMoney(depositCents)}</span>
          {depositStatus && <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${depositTone}`}>{depositStatus.replace(/_/g, ' ')}</span>}
        </div>
        <p className="mt-1 text-xs text-[#173b3b]/50">Rental {number}</p>

        {depositHistory.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-[#173b3b]/70">
            {depositHistory.map((t) => (
              <li key={t.id}>
                {t.kind === 'held' ? '💠 ' : t.kind === 'returned' ? '↩️ ' : '⚠️ '}{t.kind.replace(/_/g, ' ')} · {formatMoney(t.amountCents)} · {new Date(t.createdAt).toLocaleString()}
                {t.note ? ` — ${t.note}` : ''}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold text-[#173b3b]/60">Amount (Rp)
            <input value={txnAmount} onChange={(e) => setTxnAmount(e.target.value.replace(/\D/g, ''))} className="mt-1 w-full rounded-lg border border-[#173b3b]/15 bg-[#f7f5ef] px-3 py-2 text-sm" placeholder="e.g. 1500000" />
          </label>
          <label className="block text-xs font-bold text-[#173b3b]/60">Note
            <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-lg border border-[#173b3b]/15 bg-[#f7f5ef] px-3 py-2 text-sm" placeholder="Optional" />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => run('hold', async () => recordDepositAction({ bookingId, kind: 'held', note }))}
            disabled={busy !== '' || remainingDeposit >= depositCents}
            className="rounded-full bg-[#173b3b] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >{busy === 'hold' && <Loader2 size={13} className="inline animate-spin" />} Hold deposit</button>
          <button
            onClick={() => run('ret', async () => recordDepositAction({ bookingId, kind: 'returned', amountCents: rupiahToCents(txnAmount), note }))}
            disabled={busy !== '' || !Number(txnAmount)}
            className="rounded-full border border-[#173b3b]/15 px-4 py-2 text-xs font-bold hover:bg-[#e4eee8] disabled:opacity-50"
          >{busy === 'ret' && <Loader2 size={13} className="inline animate-spin" />} Return</button>
          <button
            onClick={() => run('forf', async () => recordDepositAction({ bookingId, kind: 'forfeited', amountCents: rupiahToCents(txnAmount), note }))}
            disabled={busy !== '' || !Number(txnAmount)}
            className="rounded-full border border-[#a43d2b]/40 px-4 py-2 text-xs font-bold text-[#a43d2b] hover:bg-[#f5d9d3] disabled:opacity-50"
          >{busy === 'for' && <Loader2 size={13} className="inline animate-spin" />} Forfeit</button>
        </div>
        <p className="mt-2 text-xs text-[#173b3b]/50">Remaining held: {formatMoney(Math.max(0, remainingDeposit))} of {formatMoney(depositCents)}.</p>
      </div>
<div className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
        <h2 className="flex items-center gap-2 font-bold"><Banknote size={18} /> Payments</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="font-serif text-2xl font-bold">{formatMoney(paidCents)}</span>
          <span className="text-xs text-[#173b3b]/50">of {formatMoney(totalCents)} rental due</span>
          {totalCents > 0 && paidCents >= totalCents
            ? <span className="rounded-full bg-[#e4eee8] px-2.5 py-1 text-[11px] font-bold text-[#27604a]">paid</span>
            : paidCents > 0
              ? <span className="rounded-full bg-[#f0ecd0] px-2.5 py-1 text-[11px] font-bold text-[#7a6a2a]">partially paid</span>
              : <span className="rounded-full bg-[#e0e3e0] px-2.5 py-1 text-[11px] font-bold text-[#4d6b62]">unpaid</span>}
        </div>

        {payments.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-[#173b3b]/70">
            {payments.map((p) => (
              <li key={p.id}>💳 {METHOD_LABEL[p.method] ?? p.method} · {formatMoney(p.amountCents)}{p.reference ? ` — ${p.reference}` : ''} · {new Date(p.receivedAt).toLocaleString()}</li>
            ))}
          </ul>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold text-[#173b3b]/60">Method
            <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="mt-1 w-full rounded-lg border border-[#173b3b]/15 bg-[#f7f5ef] px-3 py-2 text-sm">
              {Object.entries(METHOD_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-[#173b3b]/60">Amount (Rp)
            <input value={payAmount} onChange={(e) => setPayAmount(e.target.value.replace(/\D/g, ''))} className="mt-1 w-full rounded-lg border border-[#173b3b]/15 bg-[#f7f5ef] px-3 py-2 text-sm" placeholder="e.g. 500000" />
          </label>
        </div>

        <button
          onClick={() => run('pay', async () => recordPaymentAction({ bookingId, method: payMethod, amountCents: rupiahToCents(payAmount), note }))}
          disabled={busy !== '' || !Number(payAmount)}
          className="mt-3 flex items-center gap-2 rounded-full bg-[#e76f51] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50"
        >{busy === 'pay' && <Loader2 size={13} className="inline animate-spin" />} Record payment</button>
      </div>

      {error && <p className="flex items-center gap-2 text-sm font-bold text-[#a43d2b]"><CircleDollarSign size={15} /> {error}</p>}
      <p className="text-[11px] text-[#173b3b]/40">Deposits are tracked separately from rental fees and never folded into the total (§13, §16).</p>
    </div>
  )
}