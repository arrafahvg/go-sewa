'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/services/auth'
import {
  createAddOn, deleteAddOn, listAddOnIdsForProduct, setProductAddOns, updateAddOn,
  type AddOnInput,
} from '@/lib/services/addons'

type Result = { ok: true } | { ok: false; error: string }

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong. Please try again.' }
}

/** Staff-create a rental add-on (ID + EN names, per-day/per-rental pricing). */
export async function createAddOnAction(input: AddOnInput): Promise<Result & { id?: string }> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to manage add-ons.' }
  try {
    const created = await createAddOn(input, staff.id)
    revalidatePath('/admin/content/add-ons')
    revalidatePath('/', 'layout')
    return { ok: true, id: created.id }
  } catch (e) {
    return fail(e)
  }
}

/** Staff-update an existing rental add-on. */
export async function updateAddOnAction(id: string, patch: Partial<AddOnInput>): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to manage add-ons.' }
  try {
    await updateAddOn(id, patch, staff.id)
    revalidatePath('/admin/content/add-ons')
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

/** Staff-delete a rental add-on — refused while products still attach it. */
export async function deleteAddOnAction(id: string): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to manage add-ons.' }
  try {
    await deleteAddOn(id, staff.id)
    revalidatePath('/admin/content/add-ons')
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

/** Read which add-on ids are attached to a product (product form pre-fill). */
export async function listProductAddOnIdsAction(productId: string): Promise<string[]> {
  const staff = await requireStaff()
  if (!staff) return []
  try {
    return await listAddOnIdsForProduct(productId)
  } catch {
    return []
  }
}

/** Replace the add-ons attached to a product (replace-all semantics). */
export async function setProductAddOnsAction(productId: string, addOnIds: string[]): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to manage add-ons.' }
  try {
    await setProductAddOns(productId, addOnIds, staff.id)
    revalidatePath('/admin/inventory')
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}
