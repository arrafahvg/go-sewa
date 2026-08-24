'use server'

import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/services/audit'
import { storageProvider } from '@/lib/services/storage'
import { requireStaff } from '@/lib/services/auth'
import * as cms from '@/lib/services/cms'
import type { HomeSection } from '@/lib/types/cms'
import type { HomeSeo } from '@/lib/services/cms'

type Result = { ok: true } | { ok: false; error: string }

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong. Please try again.' }
}

const REVALIDATE = ['/', '/admin/content', '/admin']

const ALLOWED_HERO_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const MAX_HERO_BYTES = 50 * 1024 * 1024 // 50 MB

/**
 * Managed hero image upload (§42, §68). Staff-only. Validates server-side,
 * stores publicly via the storage provider and returns the URL; the caller
 * persists it on the hero section via `saveHomeSectionsAction` (audit-logged).
 */
export async function uploadHeroImageAction(input: { fileBase64: string; mimeType: string }): Promise<Result & { url?: string }> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to upload a hero image.' }
  try {
    if (!ALLOWED_HERO_MIME.includes(input.mimeType)) {
      return { ok: false, error: 'Only PNG, JPG, WebP or GIF images are accepted.' }
    }
    const bytes = Buffer.from(input.fileBase64, 'base64')
    if (bytes.length === 0) return { ok: false, error: 'The file is empty.' }
    if (bytes.length > MAX_HERO_BYTES) return { ok: false, error: 'The image must be under 50 MB.' }

    const ext = input.mimeType === 'image/png' ? 'png'
      : input.mimeType === 'image/jpeg' ? 'jpg'
      : input.mimeType === 'image/webp' ? 'webp' : 'gif'
    const uploaded = await storageProvider.uploadFile(bytes, {
      originalName: `hero.${ext}`,
      mimeType: input.mimeType,
      folder: 'site',
    })
    await logActivity({
      userId: staff.id, action: 'hero_image_uploaded', entity: 'cms_pages',
      entityId: 'home', metadata: { url: uploaded.url, mimeType: input.mimeType },
    })
    revalidatePath('/', 'layout')
    return { ok: true, url: uploaded.url }
  } catch (e) {
    return fail(e)
  }
}

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
