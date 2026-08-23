'use client'

import { useState } from 'react'
import { Check, Copy, Download, Link2, Loader2, Mail, MessageCircle, Printer } from 'lucide-react'
import { createShareTokenAction, revokeShareTokenAction } from '@/app/actions/documents'

/**
 * Shared toolbar for printable documents (invoices & agreements):
 * - Print / Save PDF  → browser print dialog (existing behaviour)
 * - Download PDF      → real .pdf rendered in-browser from the on-screen
 *   document (jsPDF + html2canvas, dynamically imported)
 * - Share             → mints a public read-only token link (/d/<token>),
 *   then opens WhatsApp or email with that link pre-filled
 */
export default function DocumentActions({
  kind,
  docId,
  title,
  messageLines,
}: {
  kind: 'invoice' | 'agreement'
  docId: string
  title: string
  messageLines: string[]
}) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  const ensureToken = async (): Promise<string | null> => {
    if (shareUrl) return shareUrl
    setBusy('token'); setError('')
    const res = await createShareTokenAction(kind, docId)
    setBusy('')
    if (!res.ok) { setError(res.error); return null }
    const url = `${window.location.origin}/d/${res.token}`
    setShareUrl(url)
    return url
  }

  const downloadPdf = async () => {
    const el = document.getElementById('printable-doc')
    if (!el) { setError('Document not found on page.'); return }
    setBusy('pdf'); setError('')
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'), import('jspdf'),
      ])
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const imgW = pageW
      const imgH = (canvas.height * imgW) / canvas.width
      let remaining = imgH
      let position = 0
      while (remaining > 0) {
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, position, imgW, imgH)
        remaining -= pageH
        if (remaining > 0) { position -= pageH; pdf.addPage() }
      }
      pdf.save(`${title}.pdf`)
    } catch {
      setError('Could not generate the PDF. Please try again.')
    }
    setBusy('')
  }

  const shareWhatsApp = async () => {
    const url = await ensureToken()
    if (!url) return
    const text = `${messageLines.join('\n')}\n${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  const shareEmail = async () => {
    const url = await ensureToken()
    if (!url) return
    window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${messageLines.join('\n')}\n\n${url}`)}`
  }

  const copyLink = async () => {
    const url = await ensureToken()
    if (!url) return
    await navigator.clipboard.writeText(url)
    setBusy('copied')
    setTimeout(() => setBusy(''), 1500)
  }

  const revoke = async () => {
    setBusy('revoke'); setError('')
    const res = await revokeShareTokenAction(kind, docId)
    setBusy('')
    if (!res.ok) { setError(res.error); return }
    setShareUrl(null)
  }

  const btn = 'flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold disabled:opacity-50'

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <button onClick={() => window.print()} className={`${btn} bg-[#173b3b] text-white`}>
        <Printer size={14} /> Print
      </button>
      <button onClick={downloadPdf} disabled={busy !== ''} className={`${btn} border border-[#173b3b]/20 hover:bg-[#e4eee8]`}>
        {busy === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download PDF
      </button>
      <button onClick={shareWhatsApp} disabled={busy !== ''} className={`${btn} bg-[#25D366] text-white`}>
        {busy === 'token' ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />} WhatsApp
      </button>
      <button onClick={shareEmail} disabled={busy !== ''} className={`${btn} border border-[#173b3b]/20 hover:bg-[#e4eee8]`}>
        <Mail size={14} /> Email
      </button>
      <button onClick={copyLink} disabled={busy !== ''} className={`${btn} border border-[#173b3b]/20 hover:bg-[#e4eee8]`}>
        {busy === 'copied' ? <Check size={14} /> : busy === 'token' ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
        {busy === 'copied' ? 'Copied!' : 'Copy link'}
      </button>
      {shareUrl && (
        <button onClick={revoke} disabled={busy !== ''} className={`${btn} border border-[#a43d2b]/40 text-[#a43d2b] hover:bg-[#f5d9d3]`}>
          <Link2 size={14} /> Revoke link
        </button>
      )}
      {error && <span className="text-xs font-bold text-[#a43d2b]">{error}</span>}
    </div>
  )
}