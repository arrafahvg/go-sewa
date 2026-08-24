import { db } from '@/lib/db'
import { settings, DEFAULT_SETTINGS } from '@/lib/db/schema'
import { uid } from '@/lib/services/audit'

/** Load all settings merged with defaults. Values are strings. */
export async function getSettings(): Promise<Record<string, string>> {
  try {
    const rows = await db.select().from(settings)
    const merged: Record<string, string> = { ...DEFAULT_SETTINGS }
    for (const row of rows) merged[row.key] = row.value
    return merged
  } catch {
    // If the settings table is not available (e.g. no DB yet) fall back to defaults.
    return { ...DEFAULT_SETTINGS }
  }
}

export async function getSetting(key: string): Promise<string> {
  const all = await getSettings()
  return all[key] ?? DEFAULT_SETTINGS[key] ?? ''
}

/** Configurable WhatsApp number for CTAs (spec §18) — never hardcode in components. */
export async function getWhatsappNumber(): Promise<string> {
  const raw = await getSetting('whatsapp_number')
  return raw.replace(/[^0-9]/g, '') || DEFAULT_SETTINGS.whatsapp_number
}

/** Build a wa.me link with a contextual pre-filled message. */
export function waLink(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

/** Parse a setting that stores an integer. */
export async function getSettingInt(key: string, fallback: number): Promise<number> {
  const raw = await getSetting(key)
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const money = (cents: number): string =>
  `Rp ${(cents / 100).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`

/** One manually-configured transfer destination shown on invoices (§16). */
export type BankAccount = {
  bankName: string
  accountNumber: string
  accountHolder: string
}

export type PaymentDetails = {
  accounts: BankAccount[]
  qrisImageUrl: string
  instructions: string
}

/** Parse a stored bank-accounts value (JSON string or already-parsed jsonb). */
function parseBankAccounts(raw: unknown): BankAccount[] {
  try {
    const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw || '[]') : raw
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((a): a is Record<string, unknown> => !!a && typeof a === 'object')
      .map((a) => ({
        bankName: String(a.bankName ?? '').trim(),
        accountNumber: String(a.accountNumber ?? '').trim(),
        accountHolder: String(a.accountHolder ?? '').trim(),
      }))
      .filter((a) => a.bankName || a.accountNumber)
  } catch {
    return []
  }
}

/**
 * Load staff-configured manual payment details (bank transfer / QRIS).
 * This replaces an online payment gateway for now (§16): customers pay by
 * transfer or QRIS using details printed on the invoice/share link. All values
 * live in settings (§73) — never hardcoded anywhere else.
 */
export async function getPaymentDetails(): Promise<PaymentDetails> {
  const s = await getSettings()
  return {
    accounts: parseBankAccounts(s.payment_bank_accounts ?? '[]'),
    qrisImageUrl: (s.payment_qris_image_url ?? '').trim(),
    instructions: (s.payment_instructions ?? '').trim(),
  }
}

type PaymentOverrideSource = {
  paymentAccounts?: unknown
  paymentQrisImageUrl?: string | null
  paymentInstructions?: string | null
} | null

/**
 * Resolve the payment details to print on a specific invoice (§16): per-invoice
 * overrides where set, falling back field-by-field to the global settings.
 * Booking-linked invoices have no overrides and simply show the defaults.
 */
export async function resolvePaymentDetails(invoice?: PaymentOverrideSource): Promise<PaymentDetails> {
  const defaults = await getPaymentDetails()
  if (!invoice) return defaults
  const overrideAccounts =
    invoice.paymentAccounts == null ? null : parseBankAccounts(invoice.paymentAccounts)
  return {
    accounts: overrideAccounts ?? defaults.accounts,
    qrisImageUrl:
      invoice.paymentQrisImageUrl != null
        ? invoice.paymentQrisImageUrl.trim()
        : defaults.qrisImageUrl,
    instructions:
      invoice.paymentInstructions != null
        ? invoice.paymentInstructions.trim()
        : defaults.instructions,
  }
}

/** Company profile / content-CMS shape (§42) served to the storefront shell. */
export type CompanyInfo = {
  businessName: string
  logoUrl: string
  businessEmail: string
  businessAddress: string
  phoneNumber: string
  instagramUrl: string
  mapsUrl: string
  footerText: string
  whatsapp: string
}

/** Load the public-facing company profile merged with defaults. */
export async function getCompanyInfo(): Promise<CompanyInfo> {
  const s = await getSettings()
  return {
    businessName: s.business_name || DEFAULT_SETTINGS.business_name,
    logoUrl: s.logo_url || '',
    businessEmail: s.business_email || '',
    businessAddress: s.business_address || '',
    phoneNumber: s.phone_number || '',
    instagramUrl: s.instagram_url || '',
    mapsUrl: s.maps_url || '',
    footerText: s.footer_text || '',
    whatsapp: await getWhatsappNumber(),
  }
}

/** Upsert a set of settings (spec §73: business rules live in the DB, not code). */
export async function saveSettings(
  updates: Record<string, string>,
  byUserId?: string | null,
): Promise<void> {
  const allowed = new Set(Object.keys(DEFAULT_SETTINGS))
  for (const [key, raw] of Object.entries(updates)) {
    if (!allowed.has(key)) continue
    const value = (raw ?? '').trim()
    await db
      .insert(settings)
      .values({ id: uid(), key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
  }
}