'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/services/auth'
import * as cms from '@/lib/services/cms'
import type { HomeSection } from '@/lib/types/cms'
import type { HomeSeo } from '@/lib/services/cms'

type Result = { ok: true } | { ok: false; error: string }

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong. Please try again.' }
}

const REVALIDATE = ['/', '/admin/content', '/admin']

export async function saveHomeSectionsAction(sections: HomeSection[]): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to edit content.' }
  try {
    await cms.saveHomeSections(sections, staff.id)
    revalidatePath('/', 'layout')
    revalidatePath('/admin/content')
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function saveFaqAction(input: {
  id?: string
  question: string
  answer: string
  active?: boolean
}): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to edit content.' }
  try {
    await cms.saveFaqItem(input, staff.id)
    revalidatePath('/', 'layout')
    revalidatePath('/admin/content')
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteFaqAction(id: string): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to edit content.' }
  if (!id) return { ok: false, error: 'Missing FAQ id.' }
  try {
    await cms.deleteFaqItem(id, staff.id)
    revalidatePath('/', 'layout')
    revalidatePath('/admin/content')
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function saveTestimonialAction(input: {
  id?: string
  name: string
  quote: string
  rating?: number
  avatarUrl?: string | null
  active?: boolean
}): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to edit content.' }
  try {
    await cms.saveTestimonialItem(input, staff.id)
    revalidatePath('/', 'layout')
    revalidatePath('/admin/content')
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteTestimonialAction(id: string): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to edit content.' }
  if (!id) return { ok: false, error: 'Missing testimonial id.' }
  try {
    await cms.deleteTestimonialItem(id, staff.id)
    revalidatePath('/', 'layout')
    revalidatePath('/admin/content')
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}
export async function saveHomeSeoAction(input: HomeSeo): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to edit content.' }
  try {
    await cms.saveHomeSeo(input, staff.id)
    revalidatePath('/', 'layout')
    revalidatePath('/admin/content')
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}
