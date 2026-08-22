import { db } from '@/lib/db'
import { settings, DEFAULT_SETTINGS } from '@/lib/db/schema'

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