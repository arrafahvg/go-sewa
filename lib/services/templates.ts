import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  agreementTemplates, agreementAcceptances, invoiceTemplates,
  rentalAgreements, bookings, bookingItems,
} from '@/lib/db/schema'
import { logActivity } from './audit'
import { formatMoney } from '@/lib/utils/money'

/**
 * Document template management (spec §21B): structured-field editing of the
 * active agreement/invoice templates. Fields are stored in settings_json and
 * rendered into the template's body_html on save, so generation keeps working
 * unchanged. Saving bumps the version; re-rendering existing DRAFT agreements
 * is an explicit, staff-initiated action — signed/printed/paid documents are
 * never modified (§58 historical accuracy).
 */

export type TemplateKind = 'agreement' | 'invoice'

export type TemplateFields = {
  headerTitle: string
  introLine: string
  terms: string            // one term per line
  footerNote: string
  signatureBlock: boolean
}

const DEFAULT_FIELDS: TemplateFields = {
  headerTitle: 'Rental Agreement',
  introLine: '',
  terms: [
    'The customer is responsible for the equipment during the rental period, including loss, theft, and damage beyond normal wear.',
    'Late returns are charged per additional day at the applicable daily rate, deducted from the deposit.',
    'The equipment must be returned in the condition noted at check-out, with all included accessories.',
    'Submerging non-waterproof equipment, disassembly, and unauthorized repair are prohibited.',
    'The deposit covers late fees, damage, and loss; any remainder is refunded after inspection.',
  ].join('\n'),
  footerNote: '',
  signatureBlock: true,
}

/**
 * Invoice templates only consume introLine + footerNote at render time — the
 * invoice document itself is structured code (§58 snapshots). Terms/signature
 * are therefore never offered or stored for invoices (§21B).
 */
const INVOICE_DEFAULT_FIELDS: TemplateFields = {
  headerTitle: 'Invoice',
  introLine: '',
  terms: '',
  footerNote: '',
  signatureBlock: false,
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Render structured fields into the template body ({{placeholders}} preserved). */
export function renderBody(fields: TemplateFields): string {
  const terms = fields.terms.split('\n').map((t) => t.trim()).filter(Boolean)
  const parts = [`<h1 style="font-family:serif">${esc(fields.headerTitle)}</h1>`]
  if (fields.introLine.trim()) parts.push(`<p>${esc(fields.introLine)}</p>`)
  parts.push('<p>Agreement <strong>{{agreement_number}}</strong> · Rental <strong>{{booking_number}}</strong> · Issued {{issued_at}}</p>')
  parts.push('<h3>Customer</h3>\n<p>{{customer_name}} · {{customer_phone}}{{customer_email_line}}</p>')
  parts.push('<h3>Rental period</h3>\n<p>{{rental_dates}}</p>')
  parts.push('<h3>Equipment &amp; charges</h3>\n{{items_table}}')
  parts.push('<p><strong>Units:</strong> {{device_list}}</p>')
  parts.push('<p>Rental fee: <strong>{{rental_total}}</strong> · Refundable deposit: <strong>{{deposit}}</strong> (held separately, returned after inspection)</p>')
  if (terms.length > 0) {
    parts.push(`<h3>Terms</h3>\n<ol>\n${terms.map((t) => `  <li>${esc(t)}</li>`).join('\n')}\n</ol>`)
  }
  if (fields.footerNote.trim()) parts.push(`<p style="margin-top:24px">${esc(fields.footerNote)}</p>`)
  if (fields.signatureBlock) {
    parts.push('<p style="margin-top:32px">Customer signature: ______________________  Date: ____________</p>')
  }
  return parts.join('\n')
}

function parseFields(json: Record<string, string> | null | undefined, kind: TemplateKind): TemplateFields {
  const defaults = kind === 'invoice' ? INVOICE_DEFAULT_FIELDS : DEFAULT_FIELDS
  return {
    headerTitle: json?.headerTitle ?? defaults.headerTitle,
    introLine: json?.introLine ?? defaults.introLine,
    terms: json?.terms ?? defaults.terms,
    footerNote: json?.footerNote ?? defaults.footerNote,
    signatureBlock: kind === 'invoice' ? false : json?.signatureBlock !== 'false',
  }
}

/** Render structured fields into the invoice template body (informational). */
export function renderInvoiceBody(fields: TemplateFields): string {
  const parts = ['<h1 style="font-family:serif">INVOICE</h1>']
  if (fields.introLine.trim()) parts.push(`<p>${esc(fields.introLine)}</p>`)
  parts.push('<p>Invoice <strong>{{invoice_number}}</strong>{{booking_number_line}}</p>')
  parts.push('<h3>Customer</h3>\n<p>{{customer_name}} · {{customer_phone}}{{customer_email_line}}</p>')
  parts.push('<h3>Items</h3>\n{{items_table}}')
  parts.push('<p><strong>Total due:</strong> {{total_due}}</p>')
  if (fields.footerNote.trim()) parts.push(`<p style="margin-top:24px">${esc(fields.footerNote)}</p>`)
  return parts.join('\n')
}

/** Load the editable fields + metadata of the active template for a kind. */
export async function getActiveTemplateFields(kind: TemplateKind) {
  if (kind === 'agreement') {
    const row = (await db.select().from(agreementTemplates).where(eq(agreementTemplates.active, true)).limit(1))[0]
      ?? (await db.select().from(agreementTemplates).limit(1))[0]
    return row
      ? { exists: true as const, name: row.name, version: row.version, fields: parseFields(row.settingsJson, kind) }
      : { exists: false as const, name: 'Default', version: 1, fields: DEFAULT_FIELDS }
  }
  const row = (await db.select().from(invoiceTemplates).where(eq(invoiceTemplates.active, true)).limit(1))[0]
    ?? (await db.select().from(invoiceTemplates).limit(1))[0]
  return row
    ? { exists: true as const, name: row.name, version: row.version ?? 1, fields: parseFields(row.settingsJson, kind) }
    : { exists: false as const, name: 'Default', version: 1, fields: INVOICE_DEFAULT_FIELDS }
}

/** Save structured template fields; bumps version, creates the row if missing. */
export async function saveTemplate(
  kind: TemplateKind,
  fields: TemplateFields,
  byUserId: string | null,
): Promise<{ version: number }> {
  // Invoices only consume intro/footer — normalize the rest so stored state
  // matches what rendering actually uses (§21B, no misleading data §80).
  const normalized: TemplateFields = kind === 'invoice'
    ? { ...fields, headerTitle: 'Invoice', terms: '', signatureBlock: false }
    : fields
  const bodyHtml = kind === 'invoice' ? renderInvoiceBody(normalized) : renderBody(normalized)
  const settingsJson = {
    headerTitle: normalized.headerTitle,
    introLine: normalized.introLine,
    terms: normalized.terms,
    footerNote: normalized.footerNote,
    signatureBlock: String(normalized.signatureBlock),
  }
  const name = kind === 'invoice'
    ? 'Invoice'
    : normalized.headerTitle.trim() || 'Rental Agreement'

  let version: number
  if (kind === 'agreement') {
    const row = (await db.select().from(agreementTemplates).where(eq(agreementTemplates.active, true)).limit(1))[0]
      ?? (await db.select().from(agreementTemplates).limit(1))[0]
    if (row) {
      version = row.version + 1
      await db.update(agreementTemplates)
        .set({ name, bodyHtml, settingsJson, version, updatedAt: new Date() })
        .where(eq(agreementTemplates.id, row.id))
    } else {
      version = 1
      await db.insert(agreementTemplates).values({
        id: crypto.randomUUID(), name, bodyHtml, settingsJson, version, active: true,
      })
    }
  } else {
    const row = (await db.select().from(invoiceTemplates).where(eq(invoiceTemplates.active, true)).limit(1))[0]
      ?? (await db.select().from(invoiceTemplates).limit(1))[0]
    if (row) {
      version = (row.version ?? 1) + 1
      await db.update(invoiceTemplates)
        .set({ name, bodyHtml, settingsJson, version, updatedAt: new Date() })
        .where(eq(invoiceTemplates.id, row.id))
    } else {
      version = 1
      await db.insert(invoiceTemplates).values({
        id: crypto.randomUUID(), name, bodyHtml, settingsJson, version, active: true,
      })
    }
  }

  await logActivity({
    userId: byUserId, action: `${kind}_template_saved`, entity: 'template',
    entityId: kind, metadata: { version },
  })
  return { version }
}

/** Count draft agreements that would be affected by a template re-render. */
export async function countDraftAgreements(): Promise<number> {
  const rows = await db.select({ id: rentalAgreements.id }).from(rentalAgreements).where(eq(rentalAgreements.status, 'draft'))
  return rows.length
}

/**
 * Re-render every DRAFT agreement from the current active template.
 * generateAgreementForBooking is idempotent per booking and refreshes existing
 * drafts in place from the latest template version. Signed/printed agreements
 * are never touched. Item/pricing data still comes from booking snapshots (§58).
 */
export async function regenerateDraftAgreements(byUserId: string | null): Promise<number> {
  // Only booking-linked drafts can be re-rendered from the template — manual
  // (booking-less) agreements have no booking snapshot to merge (§35).
  const drafts = (await db.select({ bookingId: rentalAgreements.bookingId }).from(rentalAgreements).where(eq(rentalAgreements.status, 'draft')))
    .filter((d) => d.bookingId)
  if (drafts.length === 0) return 0

  const { generateAgreementForBooking } = await import('./agreements')
  for (const d of drafts) {
    await generateAgreementForBooking(d.bookingId!, { byUserId })
  }

  await logActivity({
    userId: byUserId, action: 'agreement_drafts_regenerated', entity: 'template',
    entityId: 'agreement', metadata: { count: drafts.length },
  })
  return drafts.length
}