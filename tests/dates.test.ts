import { describe, expect, it } from 'vitest'
import { rentalDays, localeDate, addDays, overlaps, toDate } from '@/lib/utils/dates'

const D = (iso: string) => new Date(iso)

describe('rentalDays', () => {
  it('counts whole days between start and end', () => {
    expect(rentalDays(D('2026-06-01T08:00:00Z'), D('2026-06-04T08:00:00Z'))).toBe(3)
  })
  it('rounds partial days up', () => {
    expect(rentalDays(D('2026-06-01T08:00:00Z'), D('2026-06-02T09:30:00Z'))).toBe(2)
  })
  it('never returns less than one day', () => {
    expect(rentalDays(D('2026-06-01T08:00:00Z'), D('2026-06-01T10:00:00Z'))).toBe(1)
    expect(rentalDays(D('2026-06-01T08:00:00Z'), D('2026-06-01T08:00:00Z'))).toBe(1)
  })
  it('accepts strings as well as Dates', () => {
    expect(rentalDays('2026-06-01', '2026-06-03')).toBe(2)
  })
})

describe('localeDate', () => {
  it('formats yyyy-mm-dd zero-padded', () => {
    expect(localeDate(new Date(2026, 5, 4))).toBe('2026-06-04')
    expect(localeDate(new Date(2026, 0, 1))).toBe('2026-01-01')
  })
})

describe('addDays', () => {
  it('adds days without mutating the input', () => {
    const base = new Date(2026, 5, 28)
    const next = addDays(base, 5)
    expect(base.getDate()).toBe(28)
    expect(next.getMonth()).toBe(6) // rolls over into July
    expect(next.getDate()).toBe(3)
  })
  it('supports negative days', () => {
    expect(addDays(new Date(2026, 2, 5), -5).getDate()).toBe(28)
  })
})

describe('overlaps ([start,end) ranges with buffer)', () => {
  it('detects a true overlap', () => {
    expect(overlaps(D('2026-06-01'), D('2026-06-05'), D('2026-06-03'), D('2026-06-08'))).toBe(true)
  })
  it('back-to-back ranges do not overlap', () => {
    expect(overlaps(D('2026-06-01'), D('2026-06-05'), D('2026-06-05'), D('2026-06-08'))).toBe(false)
  })
  it('buffer makes back-to-back ranges conflict', () => {
    const buffer = 4 * 3600 * 1000 // turnaround hours
    expect(overlaps(D('2026-06-01'), D('2026-06-05'), D('2026-06-05'), D('2026-06-08'), buffer)).toBe(true)
  })
  it('contained ranges overlap', () => {
    expect(overlaps(D('2026-06-01'), D('2026-06-10'), D('2026-06-03'), D('2026-06-04'))).toBe(true)
  })
  it('disjoint ranges do not overlap', () => {
    expect(overlaps(D('2026-06-01'), D('2026-06-03'), D('2026-06-20'), D('2026-06-25'))).toBe(false)
  })
})

describe('toDate', () => {
  it('passes Date instances through and parses strings', () => {
    const d = new Date()
    expect(toDate(d)).toBe(d)
    expect(toDate('2026-01-01').getTime()).toBe(new Date('2026-01-01').getTime())
  })
})
