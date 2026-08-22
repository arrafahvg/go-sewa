'use server'

import { requireStaff } from '@/lib/services/auth'
import {
  createProduct, updateProduct,
  createPricingRule, updatePricingRule, deletePricingRule,
  createDevice, updateDevice,
} from '@/lib/services/inventory'
import type { PricingRuleKind } from '@/lib/db/schema'
import type { DeviceStatus } from '@/lib/services/devices'

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
  defaultFulfillment?: string
  imageUrl?: string | null
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
