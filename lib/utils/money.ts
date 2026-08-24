/** Format an integer rupiah minor-unit amount (100 units = Rp 1) as a readable string. */
export function formatMoney(cents: number, currency = 'IDR'): string {
  const value = (cents ?? 0) / 100
  const formatted = value.toLocaleString('id-ID', { maximumFractionDigits: 0 })
  return currency === 'IDR' ? `Rp ${formatted}` : `${formatted} ${currency}`
}

/**
 * Rupiah stacks: amounts are stored as integer "minor units" where 100 units = Rp 1
 * (§AGENTS — `*Cents` columns). Staff-facing inputs present plain Rupiah (e.g. typing
 * `500000` means Rp 500,000); these two helpers convert in both directions so every
 * money input follows the same convention.
 */
export function rupiahToCents(rupiah: number | string): number {
  const raw = typeof rupiah === 'string' ? Number(rupiah) : rupiah
  if (!Number.isFinite(raw) || raw <= 0) return 0
  return Math.round(raw * 100)
}

/** Convert stored minor-units back to a plain Rupiah number for an input field. */
export function centsToRupiah(cents: number): number {
  const c = Number.isFinite(cents) ? cents : 0
  return Math.round(c / 100)
}

export function formatMoneyCompact(cents: number): string {
  const value = (cents ?? 0) / 100
  if (value >= 1_000_000) {
    const m = value / 1_000_000
    return `Rp ${m.toLocaleString('id-ID', { maximumFractionDigits: 1 }).replace(',0', '')}M`
  }
  if (value >= 1000) {
    const k = value / 1000
    return `Rp ${k.toLocaleString('id-ID', { maximumFractionDigits: 0 })}K`
  }
  return `Rp ${value}`
}