import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import AgreementActions from '@/components/admin/agreement-actions'
import DocumentActions from '@/components/admin/document-actions'
import { getAgreementWithDetail } from '@/lib/services/agreements'

export const metadata: Metadata = { title: 'Rental agreement — Go-Sewa Admin' }
export const dynamic = 'force-dynamic'

export default async function AgreementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = await getAgreementWithDetail(id)
  if (!detail) notFound()
  const { agreement, customer, items, devices } = detail

  return (
    <div className="min-h-screen bg-[#f4f1ea] px-6 py-8 text-[#173b3b] print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl">
        <div className="space-y-3 print:hidden">
          <Link href="/admin/agreements" className="text-sm font-bold text-[#387066] hover:underline">← Agreements</Link>
          <p className="font-mono text-sm font-bold">{agreement.number}</p>
          <DocumentActions
            kind="agreement"
            docId={agreement.id}
            title={`Rental Agreement ${agreement.number}`}
            messageLines={[
              `Go-Sewa — Rental Agreement ${agreement.number}`,
              'Please review and sign your rental agreement:',
            ]}
          />
          <AgreementActions agreementId={agreement.id} status={agreement.status} />
        </div>

        {/* Rendered content merged at generation time from the booking snapshot (§58) + template (§21). */}
        <article
          id="printable-doc"
          className="mt-6 rounded-2xl border border-[#173b3b]/10 bg-white p-10 text-sm leading-6 print:mt-0 print:rounded-none print:border-0 [&_h1]:font-serif [&_h1]:text-2xl [&_h1]:font-bold [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-bold [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_table]:my-3 [&_th]:bg-[#f1eee7]"
          dangerouslySetInnerHTML={{ __html: agreement.contentHtml ?? `<p>No content generated yet.</p><p>Items: ${items.length}. Customer: ${customer?.name ?? '—'}.</p>` }}
        />

        <p className="mt-4 text-xs text-[#173b3b]/50 print:hidden">
          Template version {agreement.templateVersion} · status: {agreement.status}
          {devices.length > 0 && <> · units referenced: {devices.map((d) => d.assetCode).join(', ')}</>}
        </p>
      </div>
    </div>
  )
}
