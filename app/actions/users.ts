'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/services/auth'
import { createStaffUser, updateStaffRole, type StaffRole } from '@/lib/services/users'

type Result = { ok: true } | { ok: false; error: string }

/** Owner-only: create a staff account (§63). */
export async function createStaffUserAction(input: {
  name: string
  email: string
  password: string
  role: string
}): Promise<Result> {
  const current = await getCurrentUser()
  if (!current || current.role !== 'owner') {
    return { ok: false, error: 'Only the owner can create staff accounts.' }
  }
  const res = await createStaffUser(
    { name: input.name, email: input.email, password: input.password, role: input.role as StaffRole },
    current.id,
  )
  if (!res.ok) return { ok: false, error: res.error }
  revalidatePath('/admin/settings/users')
  return { ok: true }
}

/** Owner-only: change a staff member's role. */
export async function updateStaffRoleAction(input: {
  userId: string
  role: string
}): Promise<Result> {
  const current = await getCurrentUser()
  if (!current || current.role !== 'owner') {
    return { ok: false, error: 'Only the owner can change staff roles.' }
  }
  const res = await updateStaffRole({ userId: input.userId, role: input.role as StaffRole }, current.id)
  if (!res.ok) return { ok: false, error: res.error }
  revalidatePath('/admin/settings/users')
  return { ok: true }
}