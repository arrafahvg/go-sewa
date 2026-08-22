import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'

export type Role = 'owner' | 'admin' | 'staff' | 'customer'

const STAFF_ROLES: Role[] = ['owner', 'admin', 'staff']

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