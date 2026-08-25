import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { logActivity } from './audit'

/**
 * Staff account management (spec §63 lists "User management" among critical
 * owner settings). Customers never have accounts — every user row is a staff
 * member. Owner-only operations; all writes are audit-logged.
 */

export const ASSIGNABLE_ROLES = ['owner', 'admin', 'staff'] as const
export type StaffRole = (typeof ASSIGNABLE_ROLES)[number]

export function isAssignableRole(role: string): role is StaffRole {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(role)
}

export async function listStaffUsers() {
  return db.select({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  }).from(user).orderBy(asc(user.createdAt))
}

async function countOwners(): Promise<number> {
  const rows = await db.select({ id: user.id }).from(user).where(eq(user.role, 'owner'))
  return rows.length
}

/** Create a staff account. Uses better-auth server-side so password hashing stays in the library. */
export async function createStaffUser(input: {
  name: string
  email: string
  password: string
  role: StaffRole
}, byUserId: string | null): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  if (!name) return { ok: false, error: 'Name is required.' }
  if (!email.includes('@')) return { ok: false, error: 'A valid email is required.' }
  if (input.password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' }
  if (!isAssignableRole(input.role)) return { ok: false, error: 'Invalid role.' }

  try {
    const { auth } = await import('@/lib/auth')
    const res = await auth.api.signUpEmail({ body: { name, email, password: input.password } })
    if (!res?.user) return { ok: false, error: 'The account service rejected this email or password.' }
    await db.update(user).set({ role: input.role, updatedAt: new Date() }).where(eq(user.id, res.user.id))
    await logActivity({
      userId: byUserId, action: 'staff_user_created', entity: 'user',
      entityId: res.user.id, metadata: { email, role: input.role },
    })
    return { ok: true, id: res.user.id }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not create the staff account.'
    return { ok: false, error: message.includes('already') || message.includes('unique')
      ? 'An account with that email already exists.'
      : 'Could not create the staff account.' }
  }
}

/** Change a staff member's role. Guards: cannot change your own role; cannot demote the last owner. */
export async function updateStaffRole(input: {
  userId: string
  role: StaffRole
}, byUserId: string | null): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isAssignableRole(input.role)) return { ok: false, error: 'Invalid role.' }
  if (input.userId === byUserId) return { ok: false, error: 'You cannot change your own role.' }

  const target = (await db.select().from(user).where(eq(user.id, input.userId)).limit(1))[0]
  if (!target) return { ok: false, error: 'User not found.' }
  if (target.role === input.role) return { ok: true }
  if (target.role === 'owner' && input.role !== 'owner' && (await countOwners()) <= 1) {
    return { ok: false, error: 'Cannot demote the last owner. Promote another owner first.' }
  }

  await db.update(user).set({ role: input.role, updatedAt: new Date() }).where(eq(user.id, input.userId))
  await logActivity({
    userId: byUserId, action: 'staff_role_changed', entity: 'user',
    entityId: input.userId, metadata: { from: target.role, to: input.role },
  })
  return { ok: true }
}
