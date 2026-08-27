'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Trash2 } from 'lucide-react'
import { loadCart, saveCart, totalRentalDays, type CartLine } from '@/lib/cart'
import { submitBooking } from '@/app/actions/bookings'
import IdentityDocumentUpload from '@/components/identity-document-upload'
import { formatMoney } from '@/lib/utils/money'
import type { Dictionary } from '@/lib/i18n/dictionaries'

type AddOn = { id: string; nameEn: string; centsPerDay: number }

export default function CheckoutFlow({ addOns, whatsapp = '628123456789', deliveryFeeCents = 0, dict }: { addOns: AddOn[]; whatsapp?: string; deliveryFeeCents?: number; dict: Dictionary }) {
  const router = useRouter()
  const [lines, setLines] = useState<CartLine[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('pickup')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error' | 'done'>('idle')
  const [error, setError] = useState('')
    const [confirmed, setConfirmed] = useState<{ numbers: string[]; total: number; deposit: number } | null>(null)
  const [identityDoc, setIdentityDoc] = useState<{ documentId: string; customerId: string } | null>(null)

  useEffect(() => { setLines(loadCart()) }, [])

  // Each rental period becomes one booking; delivery fee is charged per booking (§15).
  const totals = useMemo(() => {
    let rental = 0
    let deposit = 0
    const periods = new Set<string>()
    for (const l of lines) {
      const days = totalRentalDays(l.startsAt, l.endsAt)
      rental += l.dailyCents * days * l.quantity
      deposit += l.depositCents * l.quantity
      periods.add(`${l.startsAt}|${l.endsAt}`)
    }
    const deliveryFee = fulfillment === 'delivery' && lines.length > 0 ? deliveryFeeCents * periods.size : 0
    return { rental, deposit, deliveryFee, due: rental + deposit + deliveryFee }
  }, [lines, fulfillment, deliveryFeeCents])

  const remove = (id: string) => {
    const next = lines.filter((l) => l.id !== id)
    setLines(next)
    saveCart(next)
  }

  const submit = async () => {
    if (!name.trim()) { setError(dict.checkout.errorName); return }
    if (!identityDoc) { setError(dict.checkout.errorIdentity); return }
    if (fulfillment === 'delivery') {
      if (!deliveryAddress.trim()) { setError(dict.checkout.errorAddress); return }
      if (!recipientName.trim()) { setError(dict.checkout.errorRecipientName); return }
      if (!recipientPhone.trim()) { setError(dict.checkout.errorRecipientPhone); return }
    }
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
          fulfillment, returnMethod: fulfillment === 'delivery' ? 'we_pick_up' : 'return_to_location',
          deliveryAddress: fulfillment === 'delivery' ? deliveryAddress.trim() : undefined,
          recipientName: fulfillment === 'delivery' ? recipientName.trim() : undefined,
          recipientPhone: fulfillment === 'delivery' ? recipientPhone.trim() : undefined,
          deliveryNotes: fulfillment === 'delivery' ? deliveryNotes.trim() : undefined,
          deliveryFeeCents: fulfillment === 'delivery' ? deliveryFeeCents : 0,
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
      setStatus('error'); setError(dict.checkout.submitError)
    }
  }

if (status === 'done' && confirmed) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e4eee8]"><Check size={28} className="text-[#27604a]" /></div>
        <h1 className="mt-6 font-serif text-4xl tracking-tight">{dict.checkout.receivedTitle}</h1>
        <p className="mt-3 text-sm text-[#173b3b]/60">{dict.checkout.receivedBody}</p>
        <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-[#173b3b]/10 bg-white p-6 text-left">
          <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/50">{dict.checkout.bookingNumber}</p>
          <p className="mt-1 font-mono text-xl font-bold">{confirmed.numbers.join(', ')}</p>
          <div className="mt-4 space-y-2 border-t border-[#173b3b]/10 pt-4 text-sm">
            <div className="flex justify-between"><span className="text-[#173b3b]/60">{dict.checkout.rentalFee}</span><strong>{formatMoney(confirmed.total)}</strong></div>
            <div className="flex justify-between"><span className="text-[#173b3b]/60">{dict.detail.deposit}</span><strong>{formatMoney(confirmed.deposit)}</strong></div>
            <div className="flex justify-between border-t border-[#173b3b]/10 pt-2"><span className="font-bold">{dict.checkout.totalDue}</span><span className="font-bold">{formatMoney(confirmed.total + confirmed.deposit)}</span></div>
          </div>
<a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi Go-Sewa, I'd like to ask about booking ${confirmed.numbers.join(', ')}.`)}`} target="_blank" rel="noreferrer" className="mt-6 block rounded-full bg-[#25D366] py-3 text-center text-sm font-bold text-white">{dict.checkout.contactWhatsapp}</a>
        </div>
        <button onClick={() => router.push('/rent')} className="mt-6 text-sm font-bold text-[#387066] underline-offset-4 hover:underline">{dict.checkout.browseMore}</button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-10 lg:px-8">
      <h1 className="font-serif text-4xl tracking-tight">{dict.checkout.title}</h1>

      {lines.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-[#173b3b]/15 p-12 text-center text-sm text-[#173b3b]/60">
          {dict.checkout.emptyCart}{' '}
          <button onClick={() => router.push('/rent')} className="font-bold text-[#387066] underline">{dict.checkout.browseDevices}</button>
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
                      <p className="mt-1 text-xs text-[#173b3b]/55">{l.startsAt} → {l.endsAt} ({dict.checkout.daysSuffix.replace('{days}', String(days))})</p>
                      <p className="mt-1 text-xs text-[#173b3b]/55">{formatMoney(l.dailyCents)}{dict.checkout.perDayShort}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatMoney(l.dailyCents * days * l.quantity)}</p>
                      <button onClick={() => remove(l.id)} className="mt-1 text-xs text-[#a43d2b] hover:underline" aria-label={dict.checkout.removeItem}><Trash2 size={15} className="inline" /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
              <h2 className="font-serif text-2xl font-bold">{dict.checkout.yourDetails}</h2>
              <div className="mt-5 space-y-4">
                <label className="block text-xs font-bold text-[#173b3b]/55">{dict.checkout.fullName}
                  <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-[#173b3b]/12 bg-[#f7f5ef] px-4 py-3 text-sm font-semibold outline-none focus:border-[#e76f51]" placeholder={dict.checkout.fullNamePlaceholder} />
                </label>
                <label className="block text-xs font-bold text-[#173b3b]/55">{dict.checkout.whatsappNumber}
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 w-full rounded-xl border border-[#173b3b]/12 bg-[#f7f5ef] px-4 py-3 text-sm font-semibold outline-none focus:border-[#e76f51]" placeholder={dict.checkout.phonePlaceholder} />
                </label>
                <label className="block text-xs font-bold text-[#173b3b]/55">{dict.checkout.emailOptional}
                  <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-[#173b3b]/12 bg-[#f7f5ef] px-4 py-3 text-sm font-semibold outline-none focus:border-[#e76f51]" placeholder={dict.checkout.emailPlaceholder} />
                </label>

                <div className="border-t border-[#173b3b]/10 pt-4">
                  <p className="text-xs font-bold text-[#173b3b]/55">{dict.checkout.pickupOrDelivery}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setFulfillment('pickup')} aria-pressed={fulfillment === 'pickup'} className={`rounded-xl border-2 px-4 py-3 text-left transition ${fulfillment === 'pickup' ? 'border-[#e76f51] bg-[#fff4f0]' : 'border-[#173b3b]/12 bg-[#f7f5ef] hover:border-[#173b3b]/25'}`}>
                      <span className="block text-sm font-bold">{dict.checkout.pickup}</span>
                      <span className="block text-xs text-[#173b3b]/55">{dict.checkout.pickupNote}</span>
                    </button>
                    <button type="button" onClick={() => setFulfillment('delivery')} aria-pressed={fulfillment === 'delivery'} className={`rounded-xl border-2 px-4 py-3 text-left transition ${fulfillment === 'delivery' ? 'border-[#e76f51] bg-[#fff4f0]' : 'border-[#173b3b]/12 bg-[#f7f5ef] hover:border-[#173b3b]/25'}`}>
                      <span className="block text-sm font-bold">{dict.checkout.delivery}</span>
                      <span className="block text-xs text-[#173b3b]/55">{deliveryFeeCents > 0 ? dict.checkout.perBooking.replace('{fee}', formatMoney(deliveryFeeCents)) : dict.checkout.free}</span>
                    </button>
                  </div>

                  {fulfillment === 'delivery' && (
                    <div className="mt-4 space-y-3 rounded-xl bg-[#faf8f2] p-4">
                      <label className="block text-xs font-bold text-[#173b3b]/55">{dict.checkout.deliveryAddress}
                        <textarea rows={2} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder={dict.checkout.addressPlaceholder} className="mt-2 w-full rounded-xl border border-[#173b3b]/12 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#e76f51]" />
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-xs font-bold text-[#173b3b]/55">{dict.checkout.recipientName}
                          <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder={dict.checkout.recipientNamePlaceholder} className="mt-2 w-full rounded-xl border border-[#173b3b]/12 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#e76f51]" />
                        </label>
                        <label className="block text-xs font-bold text-[#173b3b]/55">{dict.checkout.recipientWhatsapp}
                          <input value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder={dict.checkout.phonePlaceholder} className="mt-2 w-full rounded-xl border border-[#173b3b]/12 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#e76f51]" />
                        </label>
                      </div>
                      <label className="block text-xs font-bold text-[#173b3b]/55">{dict.checkout.deliveryNotesOptional}
                        <input value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} placeholder={dict.checkout.notesPlaceholder} className="mt-2 w-full rounded-xl border border-[#173b3b]/12 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#e76f51]" />
                      </label>
                      {deliveryFeeCents > 0 && (
                        <p className="text-xs text-[#173b3b]/55">{dict.checkout.deliveryFeeNotice.replace('{fee}', formatMoney(deliveryFeeCents))}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-[#173b3b]/10 pt-4">
                  <IdentityDocumentUpload customerName={name} customerPhone={phone} onUploaded={setIdentityDoc} />
                </div>

                <label className="flex items-start gap-3 text-xs text-[#173b3b]/65">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
                  {dict.checkout.agreement}
                </label>

                <div className="space-y-2 border-t border-[#173b3b]/10 pt-4 text-sm">
                  <div className="flex justify-between"><span className="text-[#173b3b]/60">{dict.checkout.rentalFee}</span><strong>{formatMoney(totals.rental)}</strong></div>
                  <div className="flex justify-between"><span className="text-[#173b3b]/60">{dict.checkout.depositRefundable}</span><strong>{formatMoney(totals.deposit)}</strong></div>
                  {totals.deliveryFee > 0 && (
                    <div className="flex justify-between"><span className="text-[#173b3b]/60">{dict.checkout.deliveryFee}</span><strong>{formatMoney(totals.deliveryFee)}</strong></div>
                  )}
                  <div className="flex justify-between border-t border-[#173b3b]/10 pt-2"><span className="font-bold">{dict.checkout.totalDue}</span><span className="font-bold">{formatMoney(totals.due)}</span></div>
                </div>

                {error && (
                  <p role="alert" className="text-sm font-semibold text-[#a43d2b]">
                    {error}
                  </p>
                )}

                <button onClick={submit} disabled={status === 'submitting'} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#173b3b] py-4 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50">
                  {status === 'submitting' && <Loader2 size={16} className="animate-spin" />}
                  {dict.checkout.submitBooking}
                </button>
                <p className="text-center text-xs text-[#173b3b]/50">{dict.checkout.indicativeNote}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}