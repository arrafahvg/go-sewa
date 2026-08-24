import { markOverdueRentals } from '@/lib/services/overdue'

/**
 * Self-hosted scheduler fallback (§17). Vercel Cron (vercel.json) calls
 * /api/cron/overdue hourly on Vercel; for other deployments set
 * ENABLE_INTERNAL_CRON=1 to run the same idempotent sweep in-process.
 * The globalThis guard prevents duplicate intervals during HMR.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (process.env.ENABLE_INTERNAL_CRON !== '1') return

  const g = globalThis as typeof globalThis & { __goSewaOverdueTimer?: NodeJS.Timeout }
  if (g.__goSewaOverdueTimer) return

  const sweep = async () => {
    try {
      const result = await markOverdueRentals()
      if (result.updatedBookings > 0) console.log(`[cron] marked ${result.updatedBookings} rental(s) overdue`)
    } catch (e) {
      console.error('[cron] overdue sweep failed:', e)
    }
  }

  // Run once shortly after boot, then every 15 minutes.
  setTimeout(sweep, 10_000)
  g.__goSewaOverdueTimer = setInterval(sweep, 15 * 60 * 1000)
}
