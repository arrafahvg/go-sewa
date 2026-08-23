'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/services/auth'
import {
  createLead, updateLeadStatus, convertLeadToCustomer,
} from '@/lib/services/leads'

/**
 * CRM / leads server actions (spec §33; §54, §59, §63). All guarded server-side;
 * typed results so raw errors never reach the UI.
 */
type Result = { ok: true } | { ok: false; error: string }

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong. Please try again.' }
}

function refresh() {
  revalidatePath('/admin')
  revalidatePath('/admin/leads')
}

export async function saveLeadAction(input: {
  name: string
  phone?: string | null
  email?: string | null
  source?: string
  interest?: string | null
  notes?: string | null
}): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to manage leads.' }
  try {
    await createLead(input, staff.id)
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function updateLeadStatusAction(id: string, status: string): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to manage leads.' }
  try {
    await updateLeadStatus(id, status, staff.id)
    refresh()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function convertLeadAction(id: string): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to manage leads.' }
  try {
    await convertLeadToCustomer(id, staff.id)
    refresh()
    revalidatePath('/admin/customers')
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}