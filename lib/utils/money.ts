/** Format an integer rupiah minor-unit amount (1 = Rp 1) as a readable string. */
export function formatMoney(cents: number, currency = 'IDR'): string {
  const value = (cents ?? 0) / 100
  const formatted = value.toLocaleString('id-ID', { maximumFractionDigits: 0 })
  return currency === 'IDR' ? `Rp ${formatted}` : `${formatted} ${currency}`
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