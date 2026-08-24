import type { Metadata } from 'next'
import Link from 'next/link'
import { listAgreements } from '@/lib/services/agreements'
import { getCustomers } from '@/lib/data/admin'
import ManualAgreementPanel from '@/components/admin/manual-agreement-panel'

export const metadata: Metadata = { title: 'Rental agreements — Go-Sewa Admin' }
export const dynamic = 'force-dynamic'

const STATUS_TONE: Record<string, string> = {
  draft: 'bg-[#f0ecd0] text-[#7a6a2a]',
  printed: 'bg-[#e4eee8] text-[#27604a]',
  signed: 'bg-[#e0e3e0] text-[#4d6b62]',
}

export default async function AgreementsPage() {
  const rows = await listAgreements()
  const customers = await getCustomers()

  return (
    <div className="min-h-screen bg-[#f4f1ea] px-4 py-8 text-[#173b3b] sm:px-6 xl:px-10">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">
          <Link href="/admin" className="hover:underline">Admin</Link> / Rental agreements
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-3xl tracking-tight">Rental agreements</h1>
          <ManualAgreementPanel customers={customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email }))} />
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-[#173b3b]/10 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#f1eee7] text-xs text-[#173b3b]/50">
              <tr>{['Agreement', 'Rental', 'Customer', 'Status', 'Template', 'Created', ''].map((h, i) => <th key={i} className="px-5 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-[#173b3b]/50">No agreements yet — generate one from a booking, or create a manual agreement above.</td></tr>
              )}
              {rows.map((ag) => (
                <tr key={ag.id} className="border-t border-[#173b3b]/8 transition hover:bg-[#faf8f2]">
                  <td className="px-5 py-4 font-mono text-xs font-bold">
                    <Link href={`/admin/agreements/${ag.id}`} className="text-[#387066] underline-offset-2 hover:underline">{ag.number}</Link>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs">{ag.bookingNumber ?? 'Manual'}</td>
                  <td className="px-5 py-4 font-bold">{ag.customerName ?? '—'}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_TONE[ag.status] ?? 'bg-[#e0e3e0] text-[#4d6b62]'}`}>{ag.status}</span></td>
                  <td className="px-5 py-4 text-xs text-[#173b3b]/55">v{ag.templateVersion}</td>
                  <td className="px-5 py-4 text-xs text-[#173b3b]/55">{ag.createdAt.toLocaleDateString()}</td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/admin/agreements/${ag.id}`} className="rounded-full border border-[#173b3b]/15 px-3 py-1.5 text-xs font-bold hover:bg-[#e4eee8]">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}