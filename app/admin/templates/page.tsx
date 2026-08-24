import type { Metadata } from 'next'
import Link from 'next/link'
import TemplateEditor from '@/components/admin/template-editor'
import { getActiveTemplateFields } from '@/lib/services/templates'

/**
 * Document template editor (spec §21B): structured-field editing of the active
 * agreement & invoice templates, with live preview and optional re-render of
 * existing drafts on save (§58 snapshots are never recomputed).
 */
export const metadata: Metadata = { title: 'Document templates — Go-Sewa Admin' }
export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
  const [agreement, invoice] = await Promise.all([
    getActiveTemplateFields('agreement'),
    getActiveTemplateFields('invoice'),
  ])

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#173b3b]">
      <div className="px-4 py-8 sm:px-6 xl:px-10">
        <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45"><Link href="/admin" className="hover:underline">Admin</Link> / Templates</p>
        <h1 className="mt-2 font-serif text-3xl tracking-tight">Document templates</h1>
        <p className="mt-1 text-sm text-[#173b3b]/60">Edit the header, terms and footer of your rental agreements and invoices. New documents use the saved version; existing signed or paid documents never change.</p>

        <div className="mt-6 space-y-6">
          <TemplateEditor kind="agreement" initial={agreement} />
          <TemplateEditor kind="invoice" initial={invoice} />
        </div>
      </div>
    </div>
  )
}