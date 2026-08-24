import { describe, expect, it } from 'vitest'
import { formatMoney, rupiahToCents, centsToRupiah, formatMoneyCompact } from '@/lib/utils/money'

describe('formatMoney', () => {
  it('formats minor units as Rupiah', () => {
    expect(formatMoney(50000000)).toBe('Rp 500.000')
  })
  it('handles zero and negative-safe input', () => {
    expect(formatMoney(0)).toBe('Rp 0')
    expect(formatMoney(undefined as unknown as number)).toBe('Rp 0')
  })
  it('supports non-IDR currencies', () => {
    expect(formatMoney(125000, 'USD')).toBe('1.250 USD')
  })
})

describe('rupiahToCents', () => {
  it('converts plain rupiah to minor units', () => {
    expect(rupiahToCents(500000)).toBe(50000000)
  })
  it('accepts numeric strings', () => {
    expect(rupiahToCents('250000')).toBe(25000000)
  })
  it('returns 0 for invalid or non-positive input', () => {
    expect(rupiahToCents(-5)).toBe(0)
    expect(rupiahToCents(0)).toBe(0)
    expect(rupiahToCents('abc')).toBe(0)
    expect(rupiahToCents(Number.NaN)).toBe(0)
  })
  it('rounds fractional rupiah', () => {
    expect(rupiahToCents(10.555)).toBe(1056)
  })
})

describe('centsToRupiah', () => {
  it('converts minor units back to rupiah', () => {
    expect(centsToRupiah(50000000)).toBe(500000)
  })
  it('is the inverse of rupiahToCents for whole rupiah', () => {
    expect(centsToRupiah(rupiahToCents(123456))).toBe(123456)
  })
  it('returns 0 for invalid input', () => {
    expect(centsToRupiah(Number.NaN)).toBe(0)
    expect(centsToRupiah(Number.POSITIVE_INFINITY)).toBe(0)
  })
})

describe('formatMoneyCompact', () => {
  it('compacts millions with up to one decimal', () => {
    expect(formatMoneyCompact(150000000)).toBe('Rp 1,5M')
  })
  it('drops a trailing ,0 on round millions', () => {
    expect(formatMoneyCompact(100000000)).toBe('Rp 1M')
  })
  it('compacts thousands', () => {
    expect(formatMoneyCompact(5000000)).toBe('Rp 50K')
  })
  it('leaves small values as-is', () => {
    expect(formatMoneyCompact(9900)).toBe('Rp 99')
  })
})
