'use server'

import { requireStaff } from '@/lib/services/auth'
import {
  createProduct, updateProduct,
  createPricingRule, updatePricingRule, deletePricingRule,
  createDevice, updateDevice,
} from '@/lib/services/inventory'
import type { PricingRuleKind } from '@/lib/db/schema'
import type { DeviceStatus } from '@/lib/services/devices'
import { storageProvider } from '@/lib/services/storage'
import { logActivity, uid } from '@/lib/services/audit'

/**
 * Inventory admin server actions (§54, §59, §63). Every action re-checks the
 * session server-side — the client can never be trusted — and returns typed
 * results instead of throwing raw errors at the UI.
 */

type Result = { ok: true } | { ok: false; error: string }

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong. Please try again.' }
}

export async function saveProductAction(input: {
  id?: string
  name: string
  slug?: string
  categoryId?: string | null
  description?: string
  depositCents: number
  depositRequired: boolean
  defaultFulfillment?: string
  imageUrl?: string | null
  gallery?: string[] | null
  active?: boolean
}): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to manage inventory.' }
  try {
    if (input.id) {
      await updateProduct(input.id, input, staff.id)
    } else {
      await createProduct({ ...input, slug: input.slug ?? '' }, staff.id)
    }
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function savePricingRuleAction(input: {
  id?: string
  productId: string
  kind: PricingRuleKind
  label: string
  centsPerDay: number
  packageCents: number
  active?: boolean
  priority?: number
}): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to manage pricing.' }
  try {
    if (input.id) {
      await updatePricingRule(input.id, input, staff.id)
    } else {
      await createPricingRule(input, staff.id)
    }
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deletePricingRuleAction(id: string): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to manage pricing.' }
  try {
    await deletePricingRule(id, staff.id)
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function saveDeviceAction(input: {
  id?: string
  productId: string
  assetCode: string
  serialNumber?: string
  imei?: string
  imei2?: string
  condition?: string
  color?: string
  storage?: string
  batteryHealth?: number | null
  purchasePriceCents?: number | null
  notes?: string
  status?: DeviceStatus
  active?: boolean
}): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to manage devices.' }
  try {
    if (input.id) {
      await updateDevice(input.id, input, staff.id)
    } else {
      await createDevice(input, staff.id)
    }
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

const ALLOWED_IMAGE_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const MAX_IMAGE_BYTES = 50 * 1024 * 1024 // 50 MB

/**
 * Managed product image upload. Staff-only. Validates the file server-side
 * (MIME allow-list + size cap), stores it publicly via the storage provider
 * under products/, writes an audit entry (§63) and returns the public URL.
 * The URL is only persisted when the product form is saved.
 */
export async function uploadProductImageAction(input: { fileBase64: string; mimeType: string }): Promise<Result & { url?: string }> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to upload product images.' }
  try {
    if (!ALLOWED_IMAGE_MIME.includes(input.mimeType)) {
      return { ok: false, error: 'Only PNG, JPG, WebP or GIF images are accepted.' }
    }
    const bytes = Buffer.from(input.fileBase64, 'base64')
    if (bytes.length === 0) return { ok: false, error: 'The file is empty.' }
    if (bytes.length > MAX_IMAGE_BYTES) return { ok: false, error: 'The image must be under 50 MB.' }

    const ext = input.mimeType === 'image/png' ? 'png'
      : input.mimeType === 'image/webp' ? 'webp'
      : input.mimeType === 'image/gif' ? 'gif' : 'jpg'
    const uploaded = await storageProvider.uploadFile(bytes, {
      originalName: `product.${ext}`,
      mimeType: input.mimeType,
      folder: 'products',
    })

    await logActivity({
      userId: staff.id, action: 'product_image_uploaded', entity: 'products',
      entityId: uid(), metadata: { url: uploaded.url, mimeType: input.mimeType },
    })
    return { ok: true, url: uploaded.url }
  } catch (e) {
    return fail(e)
  }
}
