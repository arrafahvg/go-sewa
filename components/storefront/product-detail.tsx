'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Check, Loader2, MessageCircle, ShoppingBag } from 'lucide-react'
import { checkProductAvailability } from '@/app/actions/availability'
import { loadCart, saveCart, addDaysStr, todayStr, totalRentalDays, type CartLine } from '@/lib/cart'
import { formatMoney } from '@/lib/utils/money'
import type { Dictionary } from '@/lib/i18n/dictionaries'
import type { CatalogProduct } from '@/lib/data/catalog'

type AddOn = { id: string; nameEn: string; nameId: string; centsPerDay: number; centsPerRental: number }

export default function ProductDetail({ product, addOns, categoryLabel, whatsapp = '628123456789', dict }: { product: CatalogProduct; addOns: AddOn[]; whatsapp?: string; categoryLabel: string; dict: Dictionary }) {
  const router = useRouter()
  const [start, setStart] = useState(todayStr())
  const [end, setEnd] = useState(addDaysStr(3))
  const [quantity, setQuantity] = useState(1)
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])
  const [activeImage, setActiveImage] = useState(0)
  const [state, setState] = useState<{ phase: 'idle' | 'loading' | 'ok' | 'error'; message?: string; available?: number; total?: number; quote?: any }>({ phase: 'idle' })

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        const res = await checkProductAvailability({ productId: product.id, startsAt: start, endsAt: end, quantity, addOnIds: selectedAddOns, deliveryFeeCents: 0 })
        if (cancelled) return
        if (res.error) setState({ phase: 'error', message: res.error })
        else if (res.availability?.unavailable) setState({ phase: 'error', message: dict.detail.notAvailable })
        else if (res.availability && res.quote) setState({ phase: 'ok', available: res.availability.available, total: res.availability.total, quote: res.quote })
      } catch {
        if (!cancelled) setState({ phase: 'error', message: dict.detail.unableToCheck })
      }
    }, 60)
    return () => { cancelled = true; window.clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, quantity, selectedAddOns, product.id])

  const days = start < end ? totalRentalDays(start, end) : 0
  const quote = state.quote
  const availabilityCopy = state.phase === 'loading' ? undefined
    : state.phase === 'ok' ? (state.available === 1 ? dict.detail.onlyOneLeft : dict.detail.available)
    : state.phase === 'error' ? state.message : dict.detail.selectDates

  const toggleAddOn = (id: string) => setSelectedAddOns((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])
  const addToCart = () => {
    const line: CartLine = { id: `${product.id}-${Date.now()}`, productId: product.id, slug: product.slug, name: product.name, imageUrl: product.imageUrl, dailyCents: product.dailyCents, depositCents: product.depositCents, quantity, startsAt: start, endsAt: end, addOnIds: selectedAddOns }
    saveCart([...loadCart(), line])
    window.dispatchEvent(new Event('storefront-cart'))
  }
  const rentNow = () => { addToCart(); router.push('/checkout') }

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-8 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-[#e4eee8]">
            {(product.gallery[activeImage] ?? product.imageUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.gallery[activeImage] ?? product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-serif text-3xl font-bold text-[#173b3b]/30">{product.name}</div>
            )}
          </div>
          {product.gallery.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {product.gallery.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  onClick={() => setActiveImage(i)}
                  aria-label={`Show photo ${i + 1} of ${product.name}`}
                  aria-pressed={i === activeImage}
                  className={`h-16 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${i === activeImage ? 'border-[#e76f51]' : 'border-transparent opacity-70 hover:opacity-100'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#e76f51]">{categoryLabel}</p>
<h1 className="mt-2 font-serif text-4xl tracking-tight">{product.name}</h1>
            {state.phase === 'error' && state.message === dict.detail.notAvailable && (
              <span className="mt-3 inline-block rounded-full bg-[#f5d9d3] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#a43d2b]">{dict.card.notAvailable}</span>
            )}
            <p className="mt-3 text-sm leading-6 text-[#173b3b]/60">{product.description}</p>
          </div>

          {Object.keys(product.specs ?? {}).length > 0 && (
            <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">{dict.detail.specifications}</p>
              <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {Object.entries(product.specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-[#173b3b]/8 pb-2 text-sm">
                    <dt className="text-[#173b3b]/55">{k}</dt>
                    <dd className="text-right font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="flex items-end gap-6">
            <div>
              <p className="text-3xl font-bold">{formatMoney(product.dailyCents)}</p>
              <p className="text-xs text-[#173b3b]/50">{dict.card.perDay}</p>
            </div>
            {product.depositCents > 0 && (
              <div>
                <p className="text-lg font-bold text-[#173b3b]/70">{formatMoney(product.depositCents)}</p>
                <p className="text-xs text-[#173b3b]/50">{dict.detail.depositRefundable}</p>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="rounded-2xl border border-[#173b3b]/15 bg-white p-4 text-xs font-bold">Rental start
              <input type="date" min={todayStr()} value={start} onChange={(e) => setStart(e.target.value)} className="mt-2 block w-full bg-transparent text-sm font-semibold outline-none" />
            </label>
            <label className="rounded-2xl border border-[#173b3b]/15 bg-white p-4 text-xs font-bold">Return date
              <input type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} className="mt-2 block w-full bg-transparent text-sm font-semibold outline-none" />
            </label>
          </div>
          <p className="flex items-center gap-2 text-xs text-[#173b3b]/55"><CalendarDays size={14} /> {days} rental days</p>

          <div
            role="status"
            aria-live="polite"
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${state.phase === 'ok' ? 'border-[#8bc0a8] bg-[#e4eee8] text-[#27604a]' : state.phase === 'error' ? 'border-[#e8a09a] bg-[#f5d9d3] text-[#a43d2b]' : 'border-[#173b3b]/15 bg-white text-[#173b3b]/55'}`}
          >
            <div className="flex items-center gap-2">
              {state.phase === 'loading' && <Loader2 size={15} className="animate-spin" />}
              {state.phase === 'ok' && <Check size={15} />}
              {availabilityCopy}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-[#173b3b]/55">{dict.detail.quantity}</span>
            <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="h-8 w-8 rounded-full border" aria-label={dict.detail.decreaseQty}>−</button>
            <strong>{quantity}</strong>
            <button onClick={() => setQuantity((q) => q + 1)} className="h-8 w-8 rounded-full border" aria-label={dict.detail.increaseQty}>+</button>
          </div>

          {addOns.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[#173b3b]/55">{dict.detail.addOnsTitle}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {addOns.map((a) => (
                  <button key={a.id} onClick={() => toggleAddOn(a.id)} aria-pressed={selectedAddOns.includes(a.id)} className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${selectedAddOns.includes(a.id) ? 'border-[#173b3b] bg-[#173b3b] text-white' : 'border-[#173b3b]/15 bg-white text-[#173b3b]/70'}`}>
                    {a.nameEn} · {formatMoney(a.centsPerDay)}{dict.detail.perDayShort}
                  </button>
                ))}
              </div>
            </div>
          )}

          {quote && (
            <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-5 text-sm">
              <div className="flex justify-between border-b border-[#173b3b]/10 pb-2">
                <span className="text-[#173b3b]/60">{dict.detail.rentalFee.replace('{days}', String(days)).replace('{qty}', String(quantity))}</span>
                <strong>{formatMoney(quote.lineTotalCents * quantity)}</strong>
              </div>
              <div className="mt-2 flex justify-between pb-3">
                <span className="text-[#173b3b]/60">{dict.detail.deposit}</span>
                <strong>{formatMoney(quote.depositCents)}</strong>
              </div>
              <div className="flex items-center justify-between border-t border-[#173b3b]/10 pt-3">
                <span className="font-bold">{dict.detail.totalDue}</span>
                <span className="font-serif text-lg font-bold">{formatMoney(quote.totalDueCents)}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={rentNow} disabled={state.phase !== 'ok'} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#173b3b] px-6 py-4 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
              <ShoppingBag size={18} /> {dict.detail.rentNow}
            </button>
            <button onClick={addToCart} disabled={state.phase !== 'ok'} className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[#173b3b]/15 bg-white px-6 py-4 text-sm font-bold transition hover:bg-[#e4eee8] disabled:cursor-not-allowed disabled:opacity-40">
              {dict.detail.addToCart}
            </button>
          </div>

          <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi Go-Sewa, I'm interested in renting the ${product.name}.`)}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-sm font-semibold text-[#387066] underline-offset-4 hover:underline">
            <MessageCircle size={16} /> {dict.detail.needHelp}
          </a>
        </div>
      </div>
    </div>
  )
}