import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSharedDocument } from '@/lib/services/share'
import { getInvoiceDetail } from '@/lib/services/invoices'
import { getActiveTemplateFields } from '@/lib/services/templates'
import { getAgreementWithDetail } from '@/lib/services/agreements'

/**
 * Public read-only document view (§21B/§35): reached only via an unguessable,
 * revocable share token minted by staff. No admin chrome; print-friendly.
 */
export const metadata: Metadata = { title: 'Document — Go-Sewa' }
export const dynamic = 'force-dynamic'

export default async function SharedDocumentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const doc = await getSharedDocument(token)
  if (!doc) notFound()

  return (
    <div className="min-h-screen bg-white px-4 py-8 text-[#173b3b]">
      <div className="mx-auto max-w-3xl">
        <p className="mb-6 text-center font-serif text-lg font-bold">go<span className="text-[#e76f51]">—</span>sewa</p>
        {doc.kind === 'invoice' ? <SharedInvoice id={doc.id} /> : <SharedAgreement id={doc.id} />}
        <p className="mt-10 text-center text-xs text-[#173b3b]/45">
          Powered by Go-Sewa · Technology &amp; camera rentals, Bali
        </p>
      </div>
    </div>
  )
}

async function SharedInvoice({ id }: { id: string }) {
  const [detail, template] = await Promise.all([
    getInvoiceDetail(id),
    getActiveTemplateFields('invoice'),
  ])
  if (!detail) notFound()
  const { invoice, booking, customer, items, devices, lateFees, damageCharges } = detail

  return (
    <article className="rounded-2xl border border-[#173b3b]/10 bg-white p-6 sm:p-10 text-sm leading-6">
      <header className="flex items-start justify-between border-b border-[#173b3b]/15 pb-6">
        <div>
          <p className="font-serif text-xl font-bold">INVOICE</p>
          <p className="mt-1 font-mono text-xs">{invoice.number}</p>
        </div>
        <div className="text-right text-xs text-[#173b3b]/55">
          <p>Issued {invoice.issuedAt.toLocaleDateString()}</p>
          {invoice.dueAt && <p>Due {invoice.dueAt.toLocaleDateString()}</p>}
          <p className="font-bold capitalize">{invoice.status.replace(/_/g, ' ')}</p>
        </div>
      </header>

      {template.fields.introLine.trim() && (
        <p className="border-b border-[#173b3b]/8 pb-4 pt-4 text-sm italic text-[#173b3b]/60">{template.fields.introLine}</p>
      )}

      <section className="grid gap-6 py-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">Billed to</p>
          <p className="mt-2 font-bold">{customer?.name ?? '—'}</p>
          {customer?.phone && <p className="text-sm text-[#173b3b]/60">{customer.phone}</p>}
        </div>
        {booking && (
          <div className="sm:text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">Rental</p>
            <p className="mt-2 font-mono text-sm font-bold">{booking.number}</p>
            <p className="text-sm text-[#173b3b]/60">
              {booking.startsAt.toLocaleDateString()} → {booking.endsAt.toLocaleDateString()}
            </p>
          </div>
        )}
      </section>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-y border-[#173b3b]/10 text-xs uppercase tracking-wide text-[#173b3b]/50">
            <th className="py-2 font-bold">Item</th><th className="py-2 text-center font-bold">Qty</th>
            <th className="py-2 text-right font-bold">Unit</th><th className="py-2 text-right font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const name = item.productNameSnapshot ?? item.productId
            return (
              <tr key={item.id} className="border-b border-[#173b3b]/8">
                <td className="py-3 font-semibold">{item.addOnId ? `${name} (add-on)` : name}</td>
                <td className="py-3 text-center">{item.quantity}</td>
                <td className="py-3 text-right">Rp {item.unitPriceCents.toLocaleString('id-ID')}</td>
                <td className="py-3 text-right font-semibold">Rp {item.lineTotalCents.toLocaleString('id-ID')}</td>
              </tr>
            )
          })}
          {devices.length > 0 && (
            <tr className="border-b border-[#173b3b]/8"><td colSpan={4} className="py-2 text-xs text-[#173b3b]/55">Units: {devices.map((d) => d.assetCode).join(', ')}</td></tr>
          )}
          {lateFees.map((f) => (
            <tr key={f.id} className="border-b border-[#173b3b]/8">
              <td className="py-3 font-semibold text-[#a43d2b]">Late return fee ({f.daysLate}d)</td><td /><td />
              <td className="py-3 text-right font-semibold">Rp {f.amountCents.toLocaleString('id-ID')}</td>
            </tr>
          ))}
          {damageCharges.map((c) => (
            <tr key={c.id} className="border-b border-[#173b3b]/8">
              <td className="py-3 font-semibold text-[#a43d2b]">Damage charge</td><td /><td />
              <td className="py-3 text-right font-semibold">Rp {c.amountCents.toLocaleString('id-ID')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-5 ml-auto max-w-xs space-y-1.5 text-sm">
        <div className="flex justify-between border-t border-[#173b3b]/20 pt-2 text-base font-bold">
          <span>Total due</span><span>Rp {invoice.totalCents.toLocaleString('id-ID')}</span>
        </div>
      </section>

      <footer className="mt-8 border-t border-[#173b3b]/15 pt-4 text-xs leading-5 text-[#173b3b]/55">
        <p>{template.fields.footerNote.trim() || 'Late returns are charged per additional day at the applicable daily rate. The deposit covers late fees, damage, and loss; any remainder is refunded after inspection.'}</p>
        <p className="mt-2">Thank you for renting with Go-Sewa. Questions? Chat with us on WhatsApp.</p>
      </footer>
    </article>
  )
}

async function SharedAgreement({ id }: { id: string }) {
  const detail = await getAgreementWithDetail(id)
  if (!detail) notFound()
  const { agreement } = detail

  return (
    <article
      className="rounded-2xl border border-[#173b3b]/10 bg-white p-6 sm:p-10 text-sm leading-6 [&_h1]:font-serif [&_h1]:text-2xl [&_h1]:font-bold [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-bold [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_table]:my-3 [&_th]:bg-[#f1eee7]"
      dangerouslySetInnerHTML={{ __html: agreement.contentHtml ?? '<p>No content generated yet.</p>' }}
    />
  )
}