'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Loader2, Save } from 'lucide-react'
import { saveTemplateAction } from '@/app/actions/templates'
import type { TemplateFields } from '@/lib/services/templates'

/**
 * Structured-field editor for one template kind (§21B). Shows a live preview
 * of how the document skeleton will look; on save asks whether existing DRAFT
 * agreements should be re-rendered with the new version.
 */
export default function TemplateEditor({
  kind,
  initial,
}: {
  kind: 'agreement' | 'invoice'
  initial: { exists: boolean; name: string; version: number; fields: TemplateFields }
}) {
  const router = useRouter()
  const [fields, setFields] = useState<TemplateFields>(initial.fields)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const termsList = useMemo(
    () => fields.terms.split('\n').map((t) => t.trim()).filter(Boolean),
    [fields.terms],
  )

  const set = (patch: Partial<TemplateFields>) => setFields({ ...fields, ...patch })

  const save = async (regenerateDrafts: boolean) => {
    setBusy(true); setError(''); setStatus('')
    const res = await saveTemplateAction(kind, { ...fields }, regenerateDrafts)
    setBusy(false)
    if (!res.ok) { setError(res.error); return }
    setStatus(regenerateDrafts
      ? `Saved as v${res.version} and re-rendered existing draft agreements.`
      : `Saved as v${res.version}. New documents will use this version.`)
    router.refresh()
  }

  const onSaveClick = () => {
    if (kind === 'agreement' && window.confirm('Also re-render existing DRAFT agreements with this new version?\n\nOK = yes (draft agreements update)\nCancel = no (only new documents use it)')) {
      void save(true)
    } else if (kind === 'agreement') {
      void save(false)
    } else {
      void save(false)
    }
  }

  const field = 'w-full rounded-xl border border-[#173b3b]/15 bg-white px-3 py-2 text-sm focus:border-[#387066] focus:outline-none'

  return (
    <section className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold">
          <FileText size={17} />
          {kind === 'agreement' ? 'Rental agreement' : 'Invoice'} template
          <span className="rounded-full bg-[#f1eee7] px-2.5 py-1 text-[11px] font-bold text-[#173b3b]/60">
            v{initial.version}{!initial.exists && ' · default'}
          </span>
        </h2>
        <button onClick={onSaveClick} disabled={busy} className="flex items-center gap-1.5 rounded-full bg-[#173b3b] px-5 py-2 text-xs font-bold text-white disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save template
        </button>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        {/* Editor — invoices only consume intro/footer, so only those are offered */}
        <div className="space-y-3">
          {kind === 'agreement' && (
            <label className="block text-xs font-bold text-[#173b3b]/70">Document title
              <input className={`mt-1 ${field}`} value={fields.headerTitle} onChange={(e) => set({ headerTitle: e.target.value })} placeholder="Rental Agreement" />
            </label>
          )}
          <label className="block text-xs font-bold text-[#173b3b]/70">Intro line (optional)
            <input className={`mt-1 ${field}`} value={fields.introLine} onChange={(e) => set({ introLine: e.target.value })} placeholder="e.g. Thank you for choosing Go-Sewa." />
          </label>
          {kind === 'agreement' && (
            <>
              <label className="block text-xs font-bold text-[#173b3b]/70">Terms — one per line
                <textarea rows={7} className={`mt-1 ${field}`} value={fields.terms} onChange={(e) => set({ terms: e.target.value })} />
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-[#173b3b]/70">
                <input type="checkbox" checked={fields.signatureBlock} onChange={(e) => set({ signatureBlock: e.target.checked })} />
                Include customer signature line
              </label>
            </>
          )}
          <label className="block text-xs font-bold text-[#173b3b]/70">Footer note (optional)
            <input className={`mt-1 ${field}`} value={fields.footerNote} onChange={(e) => set({ footerNote: e.target.value })} />
          </label>
          {kind === 'invoice' && (
            <p className="rounded-xl bg-[#f0ecd0] px-3 py-2 text-xs font-semibold text-[#7a6a2a]">
              Invoices use a fixed structured layout (items, totals and snapshots come from the booking). Only the intro line and footer note are customizable.
            </p>
          )}
        </div>

        {/* Live preview — mirrors what the printed document actually looks like */}
        <div className="rounded-xl border border-[#173b3b]/10 bg-[#f7f5ef] p-5 text-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#173b3b]/40">Preview</p>
          {kind === 'invoice' ? (
            <>
              <h3 className="mt-2 font-serif text-xl font-bold">INVOICE</h3>
              <p className="mt-1 font-mono text-[11px]">{initial.exists ? 'INV-…' : 'Invoice #'}</p>
              {fields.introLine.trim() && <p className="mt-2 text-xs italic">{fields.introLine}</p>}
              <p className="mt-2 text-xs text-[#173b3b]/50">Billed to · Rental period · items table · totals</p>
              <div className="mt-3 flex justify-between border-t border-[#173b3b]/15 pt-2 text-xs font-bold"><span>Total due</span><span>—</span></div>
              {fields.footerNote.trim() && <p className="mt-3 text-xs">{fields.footerNote}</p>}
              <p className="mt-3 text-[11px] italic text-[#173b3b]/45">Payment details (bank accounts / QRIS) render here automatically from Settings.</p>
            </>
          ) : (
            <>
              <h3 className="mt-2 font-serif text-xl font-bold">{fields.headerTitle || '(no title)'}</h3>
              {fields.introLine.trim() && <p className="mt-1 text-xs">{fields.introLine}</p>}
              <p className="mt-2 text-xs text-[#173b3b]/50">Agreement # · Rental # · Issued …</p>
              <p className="mt-2 text-xs"><strong>Customer</strong> · dates · items table · deposit</p>
              {termsList.length > 0 && (
                <>
                  <p className="mt-3 font-bold">Terms</p>
                  <ol className="ml-4 list-decimal space-y-1 text-xs">
                    {termsList.map((t, i) => <li key={i}>{t}</li>)}
                  </ol>
                </>
              )}
              {fields.footerNote.trim() && <p className="mt-3 text-xs">{fields.footerNote}</p>}
              {fields.signatureBlock && <p className="mt-4 text-xs">Customer signature: ____________ Date: ________</p>}
            </>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-[#a43d2b]">{error}</p>}
      {status && <p className="mt-3 text-sm font-semibold text-[#27604a]">{status}</p>}
    </section>
  )
}