export function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value)
}

/** Whole rental days between two dates, rounding up to at least 1. */
export function rentalDays(startsAt: Date, endsAt: Date): number {
  const start = toDate(startsAt).getTime()
  const end = toDate(endsAt).getTime()
  const ms = end - start
  const days = Math.ceil(ms / 86_400_000)
  return Math.max(1, days)
}

/** Locale date key yyyy-mm-dd in the server's local timezone. */
export function localeDate(date: Date): string {
  const d = toDate(date)
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Add N days to a date (returns a new Date). */
export function addDays(date: Date, days: number): Date {
  const d = new Date(toDate(date))
  d.setDate(d.getDate() + days)
  return d
}

/** True when two [start,end) ranges overlap in time. */
export function overlaps(
  aStart: Date, aEnd: Date,
  bStart: Date, bEnd: Date,
  bufferMs = 0,
): boolean {
  // A and B overlap if B starts before A ends (+buffer) and A starts before B ends (+buffer).
  return toDate(bStart).getTime() < toDate(aEnd).getTime() + bufferMs &&
    toDate(aStart).getTime() < toDate(bEnd).getTime() + bufferMs
}