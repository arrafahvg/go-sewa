'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/services/auth'
import { saveSettings } from '@/lib/services/settings'
import { logActivity, uid } from '@/lib/services/audit'
import { storageProvider } from '@/lib/services/storage'

type Result = { ok: true } | { ok: false; error: string }

/**
 * Update site settings / company profile (§42, §73, §59). Re-checks the session
 * server-side, persists to the DB, and appends an audit entry (§63). Only known
 * setting keys are written — unknown keys are ignored.
 */
export async function updateSettingsAction(updates: Record<string, string>): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to update settings.' }
  try {
    await saveSettings(updates, staff.id)
    await logActivity({
      userId: staff.id,
      action: 'settings_updated',
      entity: 'settings',
      entityId: uid(),
      metadata: { keys: Object.keys(updates) },
    })
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not update settings.' }
  }
}

const ALLOWED_LOGO_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
const MAX_LOGO_BYTES = 50 * 1024 * 1024 // 50 MB

/**
 * Managed logo upload (§42). Staff-only. Validates the file server-side, stores
 * it publicly via the storage provider, saves the resulting URL to the
 * `logo_url` setting and revalidates the storefront shell.
 */
export async function uploadLogoAction(input: { fileBase64: string; mimeType: string }): Promise<Result & { url?: string }> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to upload a logo.' }
  try {
    if (!ALLOWED_LOGO_MIME.includes(input.mimeType)) {
      return { ok: false, error: 'Only PNG, JPG, WebP, SVG or GIF images are accepted.' }
    }
    const bytes = Buffer.from(input.fileBase64, 'base64')
    if (bytes.length === 0) return { ok: false, error: 'The file is empty.' }
    if (bytes.length > MAX_LOGO_BYTES) return { ok: false, error: 'The logo must be under 50 MB.' }

    const ext = input.mimeType === 'image/png' ? 'png'
      : input.mimeType === 'image/jpeg' ? 'jpg'
      : input.mimeType === 'image/webp' ? 'webp'
      : input.mimeType === 'image/gif' ? 'gif' : 'svg'
    const uploaded = await storageProvider.uploadFile(bytes, {
      originalName: `logo.${ext}`,
      mimeType: input.mimeType,
      folder: 'site',
    })

    await saveSettings({ logo_url: uploaded.url }, staff.id)
    await logActivity({
      userId: staff.id, action: 'logo_uploaded', entity: 'settings',
      entityId: uid(), metadata: { url: uploaded.url, mimeType: input.mimeType },
    })
    revalidatePath('/', 'layout')
    revalidatePath('/admin/settings')
    return { ok: true, url: uploaded.url }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not upload the logo.' }
  }
}

/** Clear the stored logo so the storefront falls back to the text brand. */
export async function removeLogoAction(): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to update settings.' }
  try {
    await saveSettings({ logo_url: '' }, staff.id)
    await logActivity({ userId: staff.id, action: 'logo_removed', entity: 'settings', entityId: 'logo_url' })
    revalidatePath('/', 'layout')
    revalidatePath('/admin/settings')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not remove the logo.' }
  }
}

const ALLOWED_QRIS_MIME = ['image/png', 'image/jpeg', 'image/webp']
const MAX_QRIS_BYTES = 50 * 1024 * 1024 // 50 MB

/**
 * Managed QRIS image upload (§16). Staff-only. Validates server-side, stores
 * it publicly via the storage provider and saves the URL to the
 * `payment_qris_image_url` setting so invoices / share links render it.
 */
export async function uploadQrisAction(input: { fileBase64: string; mimeType: string }): Promise<Result & { url?: string }> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to upload a QRIS image.' }
  try {
    if (!ALLOWED_QRIS_MIME.includes(input.mimeType)) {
      return { ok: false, error: 'Only PNG, JPG or WebP images are accepted.' }
    }
    const bytes = Buffer.from(input.fileBase64, 'base64')
    if (bytes.length === 0) return { ok: false, error: 'The file is empty.' }
    if (bytes.length > MAX_QRIS_BYTES) return { ok: false, error: 'The QRIS image must be under 50 MB.' }

    const ext = input.mimeType === 'image/png' ? 'png' : input.mimeType === 'image/jpeg' ? 'jpg' : 'webp'
    const uploaded = await storageProvider.uploadFile(bytes, {
      originalName: `qris.${ext}`,
      mimeType: input.mimeType,
      folder: 'site',
    })

    await saveSettings({ payment_qris_image_url: uploaded.url }, staff.id)
    await logActivity({
      userId: staff.id, action: 'payment_qris_uploaded', entity: 'settings',
      entityId: uid(), metadata: { url: uploaded.url, mimeType: input.mimeType },
    })
    revalidatePath('/', 'layout')
    revalidatePath('/admin/settings')
    return { ok: true, url: uploaded.url }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not upload the QRIS image.' }
  }
}

/** Clear the stored QRIS image from invoices / share links. */
export async function removeQrisAction(): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to update settings.' }
  try {
    await saveSettings({ payment_qris_image_url: '' }, staff.id)
    await logActivity({ userId: staff.id, action: 'payment_qris_removed', entity: 'settings', entityId: 'payment_qris_image_url' })
    revalidatePath('/', 'layout')
    revalidatePath('/admin/settings')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not remove the QRIS image.' }
  }
}
const ALLOWED_FAVICON_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
const MAX_FAVICON_BYTES = 5 * 1024 * 1024 // 5 MB

/**
 * Managed browser favicon upload (§42). Staff-only. Validates server-side,
 * stores it publicly via the storage provider and saves the URL to the
 * `favicon_url` setting so the root layout renders it as the tab icon.
 */
export async function uploadFaviconAction(input: { fileBase64: string; mimeType: string }): Promise<Result & { url?: string }> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to upload a favicon.' }
  try {
    if (!ALLOWED_FAVICON_MIME.includes(input.mimeType)) {
      return { ok: false, error: 'Only PNG, JPG, WebP, SVG or GIF images are accepted.' }
    }
    const bytes = Buffer.from(input.fileBase64, 'base64')
    if (bytes.length === 0) return { ok: false, error: 'The file is empty.' }
    if (bytes.length > MAX_FAVICON_BYTES) return { ok: false, error: 'The favicon must be under 5 MB.' }

    const ext = input.mimeType === 'image/png' ? 'png'
      : input.mimeType === 'image/jpeg' ? 'jpg'
      : input.mimeType === 'image/webp' ? 'webp'
      : input.mimeType === 'image/gif' ? 'gif' : 'svg'
    const uploaded = await storageProvider.uploadFile(bytes, {
      originalName: `favicon.${ext}`,
      mimeType: input.mimeType,
      folder: 'site',
    })

    await saveSettings({ favicon_url: uploaded.url }, staff.id)
    await logActivity({
      userId: staff.id, action: 'favicon_uploaded', entity: 'settings',
      entityId: uid(), metadata: { url: uploaded.url, mimeType: input.mimeType },
    })
    revalidatePath('/', 'layout')
    revalidatePath('/admin/settings')
    return { ok: true, url: uploaded.url }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not upload the favicon.' }
  }
}

/** Reset the browser favicon to the bundled /favicon.svg default. */
export async function removeFaviconAction(): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to update settings.' }
  try {
    await saveSettings({ favicon_url: '/favicon.svg' }, staff.id)
    await logActivity({ userId: staff.id, action: 'favicon_removed', entity: 'settings', entityId: 'favicon_url' })
    revalidatePath('/', 'layout')
    revalidatePath('/admin/settings')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not remove the favicon.' }
  }
}
