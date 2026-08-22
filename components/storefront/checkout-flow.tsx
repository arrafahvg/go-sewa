'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Trash2 } from 'lucide-react'
import { loadCart, saveCart, totalRentalDays, type CartLine } from '@/lib/cart'
import { submitBooking } from '@/app/actions/bookings'
import IdentityDocumentUpload from '@/components/identity-document-upload'
import { formatMoney } from '@/lib/utils/money'

type AddOn = { id: string; nameEn: string; centsPerDay: number }

export default function CheckoutFlow({ addOns, whatsapp = '628123456789' }: { addOns: AddOn[]; whatsapp?: string }) {
  const router = useRouter()
  const [lines, setLines] = useState<CartLine[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error' | 'done'>('idle')
  const [error, setError] = useState('')
    const [confirmed, setConfirmed] = useState<{ numbers: string[]; total: number; deposit: number } | null>(null)
  const [identityDoc, setIdentityDoc] = useState<{ documentId: string; customerId: string } | null>(null)

  useEffect(() => { setLines(loadCart()) }, [])

  const totals = useMemo(() => {
    let rental = 0
    let deposit = 0
    for (const l of lines) {
      const days = totalRentalDays(l.startsAt, l.endsAt)
      rental += l.dailyCents * days * l.quantity
      deposit += l.depositCents * l.quantity
    }
    return { rental, deposit, due: rental + deposit }
  }, [lines])

  const remove = (id: string) => {
    const next = lines.filter((l) => l.id !== id)
    setLines(next)
    saveCart(next)
  }

  const submit = async () => {
    if (!name.trim()) { setError('Please enter your full name.'); return }
    if (!identityDoc) { setError('Please upload your KTP or driver\'s licence photo — it is required as rental collateral.'); return }
    if (!lines.length) return
    setStatus('submitting')
    setError('')
    try {
      // Group cart lines by rental period — each period becomes one booking (§64).
      const groups = new Map<string, CartLine[]>()
      for (const l of lines) {
        const key = `${l.startsAt}|${l.endsAt}`
        groups.set(key, [...(groups.get(key) ?? []), l])
      }

      const numbers: string[] = []
      let total = 0
      let depositTotal = 0
      const consumed: string[] = []
      for (const [, groupLines] of groups) {
        const result = await submitBooking({
          customerName: name.trim(), customerPhone: phone.trim(), customerEmail: email.trim(),
          items: groupLines.map((l) => ({ productId: l.productId, quantity: l.quantity, addOnIds: l.addOnIds })),
          startsAt: groupLines[0].startsAt, endsAt: groupLines[0].endsAt,
          fulfillment: 'pickup', returnMethod: 'return_to_location',
          agreementAccepted: agreed,
          identityDocumentId: identityDoc.documentId,
          customerId: identityDoc.customerId,
        })
        if (!result.ok) { setStatus('error'); setError(result.error); return }
        numbers.push(result.number)
        total += groupLines.reduce((s, l) => s + l.dailyCents * totalRentalDays(l.startsAt, l.endsAt) * l.quantity, 0)
        depositTotal += groupLines.reduce((s, l) => s + l.depositCents * l.quantity, 0)
        consumed.push(...groupLines.map((l) => l.id))
      }
      setConfirmed({ numbers, total, deposit: depositTotal })
      setStatus('done')
      saveCart(lines.filter((l) => !consumed.includes(l.id)))
    } catch {
      setStatus('error'); setError('Unable to complete your booking. Please try again.')
    }
  }

if (status === 'done' && confirmed) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e4eee8]"><Check size={28} className="text-[#27604a]" /></div>
        <h1 className="mt-6 font-serif text-4xl tracking-tight">Booking received.</h1>
        <p className="mt-3 text-sm text-[#173b3b]/60">Thank you! Your rental booking has been received. We&apos;ll contact you via WhatsApp to confirm.</p>
        <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-[#173b3b]/10 bg-white p-6 text-left">
          <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/50">Booking number</p>
          <p className="mt-1 font-mono text-xl font-bold">{confirmed.numbers.join(', ')}</p>
          <div className="mt-4 space-y-2 border-t border-[#173b3b]/10 pt-4 text-sm">
            <div className="flex justify-between"><span className="text-[#173b3b]/60">Rental fee</span><strong>{formatMoney(confirmed.total)}</strong></div>
            <div className="flex justify-between"><span className="text-[#173b3b]/60">Deposit</span><strong>{formatMoney(confirmed.deposit)}</strong></div>
            <div className="flex justify-between border-t border-[#173b3b]/10 pt-2"><span className="font-bold">Total due</span><span className="font-bold">{formatMoney(confirmed.total + confirmed.deposit)}</span></div>
          </div>
<a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi Go-Sewa, I'd like to ask about booking ${confirmed.numbers.join(', ')}.`)}`} target="_blank" rel="noreferrer" className="mt-6 block rounded-full bg-[#25D366] py-3 text-center text-sm font-bold text-white">Contact Go-Sewa on WhatsApp</a>
        </div>
        <button onClick={() => router.push('/rent')} className="mt-6 text-sm font-bold text-[#387066] underline-offset-4 hover:underline">Browse more devices</button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-10 lg:px-8">
      <h1 className="font-serif text-4xl tracking-tight">Checkout</h1>

      {lines.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-[#173b3b]/15 p-12 text-center text-sm text-[#173b3b]/60">
          Your rental cart is empty.{' '}
          <button onClick={() => router.push('/rent')} className="font-bold text-[#387066] underline">Browse devices</button>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="space-y-3">
              {lines.map((l) => {
                const days = totalRentalDays(l.startsAt, l.endsAt)
                return (
                  <div key={l.id} className="flex items-center justify-between gap-4 rounded-2xl border border-[#173b3b]/10 bg-white p-4">
                    <div className="flex-1">
                      <p className="font-bold">{l.name} × {l.quantity}</p>
                      <p className="mt-1 text-xs text-[#173b3b]/55">{l.startsAt} → {l.endsAt} ({days} days)</p>
                      <p className="mt-1 text-xs text-[#173b3b]/55">{formatMoney(l.dailyCents)}/day</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatMoney(l.dailyCents * days * l.quantity)}</p>
                      <button onClick={() => remove(l.id)} className="mt-1 text-xs text-[#a43d2b] hover:underline" aria-label="Remove item"><Trash2 size={15} className="inline" /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
              <h2 className="font-serif text-2xl font-bold">Your details</h2>
              <div className="mt-5 space-y-4">
                <label className="block text-xs font-bold text-[#173b3b]/55">Full name
                  <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-[#173b3b]/12 bg-[#f7f5ef] px-4 py-3 text-sm font-semibold outline-none focus:border-[#e76f51]" placeholder="e.g. Maya Putri" />
                </label>
                <label className="block text-xs font-bold text-[#173b3b]/55">WhatsApp number
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 w-full rounded-xl border border-[#173b3b]/12 bg-[#f7f5ef] px-4 py-3 text-sm font-semibold outline-none focus:border-[#e76f51]" placeholder="+62 812 ..." />
                </label>
                <label className="block text-xs font-bold text-[#173b3b]/55">Email (optional)
                  <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-[#173b3b]/12 bg-[#f7f5ef] px-4 py-3 text-sm font-semibold outline-none focus:border-[#e76f51]" placeholder="you@email.com" />
                </label>

                <div className="border-t border-[#173b3b]/10 pt-4">
                  <IdentityDocumentUpload customerName={name} customerPhone={phone} onUploaded={setIdentityDoc} />
                </div>

                <label className="flex items-start gap-3 text-xs text-[#173b3b]/65">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
                  I accept the Go-Sewa rental agreement, including the deposit, damage, and late-return policies.
                </label>

                <div className="space-y-2 border-t border-[#173b3b]/10 pt-4 text-sm">
                  <div className="flex justify-between"><span className="text-[#173b3b]/60">Rental fee</span><strong>{formatMoney(totals.rental)}</strong></div>
                  <div className="flex justify-between"><span className="text-[#173b3b]/60">Deposit (refundable)</span><strong>{formatMoney(totals.deposit)}</strong></div>
                  <div className="flex justify-between border-t border-[#173b3b]/10 pt-2"><span className="font-bold">Total due before rental</span><span className="font-bold">{formatMoney(totals.due)}</span></div>
                </div>

                {error && <p className="text-sm font-semibold text-[#a43d2b]">{error}</p>}

                <button onClick={submit} disabled={status === 'submitting'} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#173b3b] py-4 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50">
                  {status === 'submitting' && <Loader2 size={16} className="animate-spin" />}
                  Submit booking
                </button>
                <p className="text-center text-xs text-[#173b3b]/50">We&apos;ll contact you via WhatsApp to confirm your rental booking.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}