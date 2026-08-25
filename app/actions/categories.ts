'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/services/auth'
import {
  createCategory, deleteCategory, updateCategory,
} from '@/lib/services/inventory'

type Result = { ok: true } | { ok: false; error: string }

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong. Please try again.' }
}

/** Staff-create a category (ID + EN names; slug auto-generated from the EN name). */
export async function createCategoryAction(input: {
  nameId: string
  nameEn: string
  showInNav?: boolean
  sortOrder?: number
  productIds?: string[]
}): Promise<Result & { id?: string; slug?: string }> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to manage categories.' }
  try {
    const created = await createCategory(input, staff.id)
    revalidatePath('/admin/content/categories')
    revalidatePath('/', 'layout')
    return { ok: true, ...created }
  } catch (e) {
    return fail(e)
  }
}

/** Staff-update a category (names, navbar visibility, sort order, active). */
export async function updateCategoryAction(input: {
  id: string
  nameId?: string
  nameEn?: string
  showInNav?: boolean
  sortOrder?: number
  active?: boolean
}): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to manage categories.' }
  try {
    await updateCategory(
      input.id,
      { nameId: input.nameId, nameEn: input.nameEn, showInNav: input.showInNav, sortOrder: input.sortOrder, active: input.active },
      staff.id,
    )
    revalidatePath('/admin/content/categories')
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

/** Staff-delete a category — refused while products still reference it. */
export async function deleteCategoryAction(id: string): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to manage categories.' }
  try {
    await deleteCategory(id, staff.id)
    revalidatePath('/admin/content/categories')
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}
