'use server'

import { getCurrentUser } from '@/lib/services/auth'

/** Role of the currently signed-in user, or null. Used to route staff to /admin after login. */
export async function getMyRole(): Promise<string | null> {
  const current = await getCurrentUser()
  return current?.role ?? null
}
