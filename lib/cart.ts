'use client'

export type CartLine = {
  id: string                  // unique cart line id
  productId: string
  slug: string
  name: string
  imageUrl: string
  dailyCents: number
  depositCents: number
  quantity: number
  startsAt: string            // yyyy-mm-dd
  endsAt: string
  addOnIds: string[]
}

const KEY = 'gosewa_cart_v1'

export function loadCart(): CartLine[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as CartLine[]) : []
  } catch {
    return []
  }
}

export function saveCart(lines: CartLine[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(lines))
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0)
}

export const todayStr = (): string => new Date().toISOString().slice(0, 10)
export const addDaysStr = (days: number): string => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export const totalRentalDays = (start: string, end: string): number => {
  const a = new Date(`${start}T00:00:00`).getTime()
  const b = new Date(`${end}T00:00:00`).getTime()
  return Math.max(1, Math.round((b - a) / 86_400_000))
}