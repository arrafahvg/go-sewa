import { NextResponse } from 'next/server'
import { markOverdueRentals } from '@/lib/services/overdue'

export const dynamic = 'force-dynamic'

/**
 * Scheduled sweep (§17): flags passed-due rentals as overdue.
 * Protect with CRON_SECRET — call as:  GET /api/cron/overdue  with header
 * `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends this automatically).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  const result = await markOverdueRentals()
  return NextResponse.json({ ok: true, ...result })
}