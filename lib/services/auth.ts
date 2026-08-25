import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'

export type Role = 'owner' | 'admin' | 'staff' | 'customer'

const STAFF_ROLES: Role[] = ['owner', 'admin', 'staff']

/**
 * Number of staff users (§54). Used by the first-run owner bootstrap on the
 * sign-in screen — once any staff account exists, sign-up stays closed.
 */
export async function countStaffUsers(): Promise<number> {
  try {
    const rows = await db.select({ id: user.id }).from(user).where(inArray(user.role, STAFF_ROLES))
    return rows.length
  } catch {
    return 0
  }
}

/** True when no staff account exists yet — the console has never been set up. */
export async function needsOwnerBootstrap(): Promise<boolean> {
  return (await countStaffUsers()) === 0
}


/** Current session user with role, or null when signed out. */
export async function getCurrentUser(): Promise<{ id: string; name: string; email: string; role: Role } | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return null
    const row = (await db.select({ role: user.role }).from(user).where(eq(user.id, session.user.id)))[0]
    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: (row?.role as Role) ?? 'customer',
    }
  } catch {
    return null
  }
}

export function isStaff(role: Role | undefined | null): boolean {
  return !!role && STAFF_ROLES.includes(role)
}

/**
 * Guard for admin pages/actions (§54). Returns the staff user, or null.
 * Owner/admin/staff all pass; customers and anonymous users do not.
 */
export async function requireStaff(): Promise<{ id: string; role: Role } | null> {
  const current = await getCurrentUser()
  if (!current || !isStaff(current.role)) return null
  return { id: current.id, role: current.role }
}