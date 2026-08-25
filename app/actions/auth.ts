'use server'

import { getCurrentUser } from '@/lib/services/auth'

import { countStaffUsers } from '@/lib/services/auth'

/** Role of the currently signed-in user, or null. Used to route staff to /admin after login. */
export async function getMyRole(): Promise<string | null> {
  const current = await getCurrentUser()
  return current?.role ?? null
}

type Result = { ok: true } | { ok: false; error: string }

/**
 * First-run owner bootstrap: allowed ONLY while no staff user exists. Creates
 * the account via better-auth (so password hashing/session handling stay in the
 * library) and promotes it to owner. Once an owner exists this is permanently
 * closed — further staff accounts are managed from the admin console/DB.
 */
export async function bootstrapOwnerAction(input: {
  name: string
  email: string
  password: string
}): Promise<Result> {
  if ((await countStaffUsers()) > 0) {
    return { ok: false, error: 'An owner account already exists. Sign in instead.' }
  }
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  if (!name || !email || input.password.length < 8) {
    return { ok: false, error: 'Name, email and a password of at least 8 characters are required.' }
  }
  try {
    const { auth } = await import('@/lib/auth')
    const res = await auth.api.signUpEmail({
      body: { name, email, password: input.password },
    })
    if (!res?.user) return { ok: false, error: 'Could not create the owner account.' }
    const { db } = await import('@/lib/db')
    const { user } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    await db.update(user).set({ role: 'owner' }).where(eq(user.id, res.user.id))
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not create the owner account.' }
  }
}
