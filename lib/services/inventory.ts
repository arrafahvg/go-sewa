import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { products, devices, rentalPricingRules, type PricingRuleKind } from '@/lib/db/schema'
import { logActivity, uid } from './audit'
import type { DeviceStatus } from './devices'

/**
 * Inventory administration services (spec §5, §56, §63): products, physical
 * devices and pricing rules. All writes record who did what in the audit log.
 * Server actions in app/actions/inventory.ts guard these behind RBAC (§54);
 * business logic lives here, not in the UI.
 */

export async function listProducts() {
  return db.select().from(products).orderBy(products.name)
}

export async function listDevicesForAdmin() {
  return db.select().from(devices).orderBy(devices.assetCode)
}

export async function listPricingRules(productId?: string) {
  const rows = await db.select().from(rentalPricingRules)
  return productId ? rows.filter((r) => r.productId === productId) : rows
}

// --- Products -----------------------------------------------------------------

export type ProductInput = {
  name: string
  slug: string
  categoryId?: string | null
  description?: string
  depositCents: number
  defaultFulfillment?: string
  imageUrl?: string | null
  specs?: Record<string, string>
  active?: boolean
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export async function createProduct(input: ProductInput, byUserId?: string | null) {
  if (!input.name.trim()) throw new Error('Product name is required.')
  const slug = slugify(input.slug || input.name)
  if (!slug) throw new Error('A valid slug is required.')
  if (!Number.isInteger(input.depositCents) || input.depositCents < 0) throw new Error('Deposit must be a non-negative integer amount.')

  const existing = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug))
  if (existing.length) throw new Error(`Slug "${slug}" is already in use.`)

  const id = uid()
  await db.insert(products).values({
    id,
    categoryId: input.categoryId ?? null,
    slug,
    name: input.name.trim(),
    description: input.description ?? '',
    specs: input.specs ?? {},
    depositCents: input.depositCents,
    defaultFulfillment: input.defaultFulfillment ?? 'pickup',
    imageUrl: input.imageUrl ?? null,
    active: input.active ?? true,
  })
  await logActivity({ userId: byUserId, action: 'product_created', entity: 'product', entityId: id, metadata: { slug } })
  return id
}

export async function updateProduct(id: string, patch: Partial<ProductInput>, byUserId?: string | null) {
  if (patch.depositCents !== undefined && (!Number.isInteger(patch.depositCents) || patch.depositCents < 0)) {
    throw new Error('Deposit must be a non-negative integer amount.')
  }
  const clean: Record<string, unknown> = { updatedAt: new Date() }
  if (patch.name !== undefined) clean.name = patch.name.trim()
  if (patch.categoryId !== undefined) clean.categoryId = patch.categoryId
  if (patch.description !== undefined) clean.description = patch.description
  if (patch.depositCents !== undefined) clean.depositCents = patch.depositCents
  if (patch.defaultFulfillment !== undefined) clean.defaultFulfillment = patch.defaultFulfillment
  if (patch.imageUrl !== undefined) clean.imageUrl = patch.imageUrl
  if (patch.specs !== undefined) clean.specs = patch.specs
  if (patch.active !== undefined) clean.active = patch.active

  const updated = await db.update(products).set(clean).where(eq(products.id, id)).returning({ id: products.id })
  if (!updated.length) throw new Error('Product not found.')

  await logActivity({ userId: byUserId, action: 'product_updated', entity: 'product', entityId: id, metadata: { fields: Object.keys(clean).filter((k) => k !== 'updatedAt') } })
}

// --- Pricing rules --------------------------------------------------------------

export type PricingRuleInput = {
  productId: string
  kind: PricingRuleKind
  label: string
  centsPerDay?: number
  packageCents?: number
  weekdays?: number[]
  startsOn?: Date | null
  endsOn?: Date | null
  active?: boolean
  priority?: number
}

export async function createPricingRule(input: PricingRuleInput, byUserId?: string | null) {
  if (!input.label.trim()) throw new Error('Rule label is required.')
  if (!Number.isInteger(input.centsPerDay ?? 0) || (input.centsPerDay ?? 0) < 0) throw new Error('centsPerDay must be a non-negative integer.')
  if (!Number.isInteger(input.packageCents ?? 0) || (input.packageCents ?? 0) < 0) throw new Error('packageCents must be a non-negative integer.')

  const id = uid()
  await db.insert(rentalPricingRules).values({
    id,
    productId: input.productId,
    kind: input.kind,
    label: input.label.trim(),
    centsPerDay: input.centsPerDay ?? 0,
    packageCents: input.packageCents ?? 0,
    weekdays: input.weekdays ?? [],
    startsOn: input.startsOn ?? null,
    endsOn: input.endsOn ?? null,
    active: input.active ?? true,
    priority: input.priority ?? 0,
  })
  await logActivity({ userId: byUserId, action: 'pricing_rule_created', entity: 'pricing_rule', entityId: id, metadata: { productId: input.productId, kind: input.kind } })
  return id
}

export async function updatePricingRule(id: string, patch: Partial<PricingRuleInput>, byUserId?: string | null) {
  const clean: Record<string, unknown> = {}
  for (const key of ['kind', 'label', 'centsPerDay', 'packageCents', 'weekdays', 'startsOn', 'endsOn', 'active', 'priority'] as const) {
    if (patch[key] !== undefined) clean[key] = patch[key]
  }
  if (!Object.keys(clean).length) return
  const updated = await db.update(rentalPricingRules).set(clean).where(eq(rentalPricingRules.id, id)).returning({ productId: rentalPricingRules.productId })
  if (!updated.length) throw new Error('Pricing rule not found.')
  await logActivity({ userId: byUserId, action: 'pricing_rule_updated', entity: 'pricing_rule', entityId: id, metadata: { productId: updated[0].productId, fields: Object.keys(clean) } })
}

export async function deletePricingRule(id: string, byUserId?: string | null) {
  const deleted = await db.delete(rentalPricingRules).where(eq(rentalPricingRules.id, id)).returning({ productId: rentalPricingRules.productId })
  if (!deleted.length) throw new Error('Pricing rule not found.')
  // Historical bookings keep their price snapshots (§58), so deleting a rule is safe.
  await logActivity({ userId: byUserId, action: 'pricing_rule_deleted', entity: 'pricing_rule', entityId: id, metadata: { productId: deleted[0].productId } })
}

// --- Physical devices -----------------------------------------------------------

export type DeviceInput = {
  productId: string
  assetCode: string
  serialNumber?: string | null
  imei?: string | null
  imei2?: string | null
  condition?: string
  color?: string | null
  storage?: string | null
  batteryHealth?: number | null
  purchasePriceCents?: number | null
  notes?: string | null
}

export async function createDevice(input: DeviceInput, byUserId?: string | null) {
  if (!input.assetCode.trim()) throw new Error('Asset code is required.')
  if (!input.productId) throw new Error('A product must be selected for the device.')
  if (input.batteryHealth !== undefined && input.batteryHealth !== null && (input.batteryHealth < 0 || input.batteryHealth > 100)) {
    throw new Error('Battery health must be between 0 and 100.')
  }
  const assetCode = input.assetCode.trim().toUpperCase()
  const dup = await db.select({ id: devices.id }).from(devices).where(eq(devices.assetCode, assetCode))
  if (dup.length) throw new Error(`Asset code ${assetCode} already exists.`)

  const id = uid()
  await db.insert(devices).values({
    id,
    productId: input.productId,
    assetCode,
    serialNumber: input.serialNumber ?? null,
    imei: input.imei ?? null,
    imei2: input.imei2 ?? null,
    condition: input.condition ?? 'excellent',
    color: input.color ?? null,
    storage: input.storage ?? null,
    batteryHealth: input.batteryHealth ?? null,
    purchasePriceCents: input.purchasePriceCents ?? null,
    notes: input.notes ?? null,
    status: 'available',
  })
  await logActivity({ userId: byUserId, action: 'device_created', entity: 'device', entityId: id, metadata: { assetCode, productId: input.productId } })
  return id
}

export type DeviceUpdatePatch = Partial<DeviceInput> & { status?: DeviceStatus; active?: boolean }

export async function updateDevice(id: string, patch: DeviceUpdatePatch, byUserId?: string | null) {
  if (patch.batteryHealth != null && (patch.batteryHealth < 0 || patch.batteryHealth > 100)) {
    throw new Error('Battery health must be between 0 and 100.')
  }
  if (patch.status !== undefined && patch.status !== 'available') {
    // Guard: staff cannot manually yank a unit that is committed to a rental.
    const current = await db.select({ status: devices.status, bookingId: devices.currentBookingId }).from(devices).where(eq(devices.id, id))
    if (!current.length) throw new Error('Device not found.')
    if (current[0].bookingId && ['rented', 'reserved', 'overdue'].includes(current[0].status)) {
      throw new Error('This unit is committed to an active booking — check it in from the booking first.')
    }
  }

  const clean: Record<string, unknown> = { updatedAt: new Date() }
  for (const key of ['serialNumber', 'imei', 'imei2', 'condition', 'color', 'storage', 'batteryHealth', 'purchasePriceCents', 'notes', 'active'] as const) {
    if (patch[key] !== undefined) clean[key] = patch[key]
  }
  if (patch.assetCode !== undefined) {
    const assetCode = patch.assetCode.trim().toUpperCase()
    const dup = await db.select({ id: devices.id }).from(devices).where(eq(devices.assetCode, assetCode))
    if (dup.length && dup[0].id !== id) throw new Error(`Asset code ${assetCode} already exists.`)
    clean.assetCode = assetCode
  }
  if (Object.keys(clean).length > 1) {
    const updated = await db.update(devices).set(clean).where(eq(devices.id, id)).returning({ id: devices.id })
    if (!updated.length) throw new Error('Device not found.')
    await logActivity({ userId: byUserId, action: 'device_updated', entity: 'device', entityId: id, metadata: { fields: Object.keys(clean).filter((k) => k !== 'updatedAt') } })
  }

  // Status changes go through setDeviceStatus so transitions stay audited & consistent (§4).
  if (patch.status !== undefined) {
    const { setDeviceStatus } = await import('./devices')
    await setDeviceStatus(id, patch.status, { byUserId })
  }
}