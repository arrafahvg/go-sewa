import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import InvoiceActions from '@/components/admin/invoice-actions'
import { getInvoiceDetail } from '@/lib/services/invoices'
import { formatMoney } from '@/lib/utils/money'

export const metadata: Metadata = { title: 'Invoice — Go-Sewa Admin' }
export const dynamic = 'force-dynamic'

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = await getInvoiceDetail(id)
  if (!detail) notFound()
  const { invoice, booking, customer, items, devices, lateFees, damageCharges } = detail

  const extrasCents =
    lateFees.reduce((s, f) => s + f.amountCents, 0) +
    damageCharges.reduce((s, c) => s + c.amountCents, 0)

  return (
    <div className="min-h-screen bg-[#f4f1ea] px-6 py-8 text-[#173b3b] print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/admin/invoices" className="text-sm font-bold text-[#387066] hover:underline">← Invoices</Link>
          <InvoiceActions invoiceId={invoice.id} status={invoice.status} />
        </div>

        {/* Printable document — merged from immutable booking snapshots (§58). */}
        <article className="mt-6 rounded-2xl border border-[#173b3b]/10 bg-white p-10 print:mt-0 print:rounded-none print:border-0">
          <header className="flex items-start justify-between border-b border-[#173b3b]/15 pb-6">
            <div>
              <p className="font-serif text-2xl font-bold">go<span className="text-[#e76f51]">—</span>sewa</p>
              <p className="mt-1 text-xs text-[#173b3b]/55">Technology &amp; camera rentals · Bali</p>
            </div>
            <div className="text-right">
              <h1 className="font-serif text-xl font-bold tracking-tight">INVOICE</h1>
              <p className="mt-1 font-mono text-xs">{invoice.number}</p>
              <p className="text-xs text-[#173b3b]/55">Issued {invoice.issuedAt.toLocaleDateString()}</p>
              {invoice.dueAt && <p className="text-xs text-[#173b3b]/55">Due {invoice.dueAt.toLocaleDateString()}</p>}
            </div>
          </header>

          <section className="grid gap-6 py-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">Billed to</p>
              <p className="mt-2 font-bold">{customer?.name ?? '—'}</p>
              {customer?.phone && <p className="text-sm text-[#173b3b]/60">{customer.phone}</p>}
              {customer?.email && <p className="text-sm text-[#173b3b]/60">{customer.email}</p>}
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">Rental</p>
              {booking ? (
                <>
                  <p className="mt-2 font-mono text-sm font-bold">{booking.number}</p>
                  <p className="text-sm text-[#173b3b]/60">
                    {booking.startsAt.toLocaleDateString()} → {booking.endsAt.toLocaleDateString()}
                  </p>
                  <p className="text-sm capitalize text-[#173b3b]/60">{booking.fulfillment} · {booking.returnMethod.replace(/_/g, ' ')}</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-[#173b3b]/50">No linked booking</p>
              )}
            </div>
          </section>

          <InvoiceLines
            items={items.map((i) => ({
              id: i.id,
              name: i.productNameSnapshot ?? i.productId,
              isAddOn: !!i.addOnId,
              ruleLabel: i.priceRuleLabel,
              quantity: i.quantity,
              unitPriceCents: i.unitPriceCents,
              lineTotalCents: i.lineTotalCents,
            }))}
            devices={devices.map((d) => ({ assetCode: d.assetCode, imei: d.imei }))}
            lateFees={lateFees.map((f) => ({ id: f.id, daysLate: f.daysLate, amountCents: f.amountCents }))}
            damageCharges={damageCharges.map((c) => ({ id: c.id, description: c.description, amountCents: c.amountCents }))}
            subtotalCents={booking?.rentalSubtotalCents ?? null}
            deliveryFeeCents={booking?.deliveryFeeCents ?? 0}
            discountCents={booking?.discountCents ?? 0}
            discountReason={booking?.discountReason ?? null}
            depositCents={booking?.depositCents ?? 0}
            totalCents={invoice.totalCents}
          />
        </article>
      </div>
    </div>
  )
}

type Line = { id: string; name: string; isAddOn: boolean; ruleLabel: string | null; quantity: number; unitPriceCents: number; lineTotalCents: number }

function InvoiceLines({ items, devices, lateFees, damageCharges, subtotalCents, deliveryFeeCents, discountCents, discountReason, depositCents, totalCents }: {
  items: Line[]
  devices: { assetCode: string; imei: string | null }[]
  lateFees: { id: string; daysLate: number; amountCents: number }[]
  damageCharges: { id: string; description: string; amountCents: number }[]
  subtotalCents: number | null
  deliveryFeeCents: number
  discountCents: number
  discountReason: string | null
  depositCents: number
  totalCents: number
}) {
  return (
    <>
      <table className="w-full text-left text-sm">
        <thead className="border-y border-[#173b3b]/15 text-xs text-[#173b3b]/50">
          <tr>{['Item', 'Qty', 'Unit', 'Total'].map((h, i) => <th key={i} className={`py-2.5 font-semibold ${i > 0 ? 'text-right' : ''}`}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-[#173b3b]/8">
              <td className="py-3">
                <p className="font-semibold">{item.name}{item.isAddOn ? ' (add-on)' : ''}</p>
                {item.ruleLabel && <p className="text-xs text-[#173b3b]/50">{item.ruleLabel}</p>}
              </td>
              <td className="py-3 text-right">{item.quantity}</td>
              <td className="py-3 text-right">{formatMoney(item.unitPriceCents)}</td>
              <td className="py-3 text-right font-semibold">{formatMoney(item.lineTotalCents)}</td>
            </tr>
          ))}
          {devices.length > 0 && (
            <tr className="border-b border-[#173b3b]/8">
              <td colSpan={4} className="py-2 text-xs text-[#173b3b]/55">
                Units: {devices.map((d) => d.assetCode).join(', ')}
                {devices.some((d) => d.imei) && <> · IMEI: {devices.filter((d) => d.imei).map((d) => d.imei).join(', ')}</>}
              </td>
            </tr>
          )}
          {lateFees.map((f) => (
            <tr key={f.id} className="border-b border-[#173b3b]/8">
              <td className="py-3"><span className="font-semibold text-[#a43d2b]">Late return fee</span> <span className="text-xs text-[#173b3b]/50">({f.daysLate} day{f.daysLate === 1 ? '' : 's'} late)</span></td>
              <td /><td />
              <td className="py-3 text-right font-semibold">{formatMoney(f.amountCents)}</td>
            </tr>
          ))}
          {damageCharges.map((c) => (
            <tr key={c.id} className="border-b border-[#173b3b]/8">
              <td className="py-3"><span className="font-semibold text-[#a43d2b]">Damage charge</span> <span className="text-xs text-[#173b3b]/50">{c.description}</span></td>
              <td /><td />
              <td className="py-3 text-right font-semibold">{formatMoney(c.amountCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-5 ml-auto max-w-xs space-y-1.5 text-sm">
        {subtotalCents !== null && <Row label="Rental subtotal" value={formatMoney(subtotalCents)} />}
        {deliveryFeeCents > 0 && <Row label="Delivery" value={formatMoney(deliveryFeeCents)} />}
        {discountCents > 0 && <Row label={`Discount${discountReason ? ` (${discountReason})` : ''}`} value={`− ${formatMoney(discountCents)}`} />}
        <div className="flex justify-between border-t border-[#173b3b]/20 pt-2 text-base font-bold">
          <span>Total due</span><span>{formatMoney(totalCents)}</span>
        </div>
        {depositCents > 0 && (
          <p className="pt-1 text-xs text-[#173b3b]/55">
            Refundable deposit: <strong>{formatMoney(depositCents)}</strong> — held separately from the rental fee and returned after successful inspection.
          </p>
        )}
      </section>

      <footer className="mt-8 border-t border-[#173b3b]/15 pt-4 text-xs leading-5 text-[#173b3b]/55 print:hidden">
        <p>Late returns are charged per additional day at the applicable daily rate. Damage or loss beyond normal wear is charged at repair/replacement cost. The deposit covers these charges; any remainder is refunded after inspection.</p>
        <p className="mt-2">Thank you for renting with Go-Sewa. Questions? Chat with us on WhatsApp.</p>
      </footer>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[#173b3b]/70">
      <span>{label}</span><span>{value}</span>
    </div>
  )
}
