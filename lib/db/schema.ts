import {
  pgTable, text, integer, boolean, timestamp, index, jsonb, pgEnum,
} from 'drizzle-orm/pg-core'

export const deviceStatusEnum = pgEnum('device_status', [
  'available', 'reserved', 'rented', 'overdue', 'returning', 'inspection',
  'maintenance', 'damaged', 'lost', 'retired', 'blocked',
])
export const bookingStatusEnum = pgEnum('booking_status', [
  'draft', 'pending', 'awaiting_confirmation', 'confirmed', 'payment_pending',
  'partially_paid', 'paid', 'reserved', 'ready_for_pickup', 'out_for_delivery',
  'active_rental', 'return_due', 'overdue', 'returned', 'inspection',
  'completed', 'cancelled', 'refunded',
])
export const channelEnum = pgEnum('booking_channel', [
  'online', 'in_store', 'phone', 'whatsapp',
])
export const paymentStatusEnum = pgEnum('payment_status', [
  'unpaid', 'pending', 'partially_paid', 'paid', 'failed', 'refunded',
])
export const depositStatusEnum = pgEnum('deposit_status', [
  'not_required', 'pending', 'held', 'partially_returned', 'returned',
  'partially_forfeited', 'forfeited',
])

// --- Availability state: one row per product+date, cached for fast reads ----
export const availabilitySummary = pgTable('availability_summary', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  localeDate: text('locale_date').notNull(),      // yyyy-mm-dd
  availableCount: integer('available_count').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [index('avail_summary_product_date_idx').on(t.productId, t.localeDate)])

export const user = pgTable('user', { id: text('id').primaryKey(), name: text('name').notNull(), email: text('email').notNull().unique(), emailVerified: boolean('emailVerified').notNull().default(false), image: text('image'), role: text('role').notNull().default('customer'), createdAt: timestamp('createdAt').notNull().defaultNow(), updatedAt: timestamp('updatedAt').notNull().defaultNow() })
export const session = pgTable('session', { id: text('id').primaryKey(), expiresAt: timestamp('expiresAt').notNull(), token: text('token').notNull().unique(), createdAt: timestamp('createdAt').notNull().defaultNow(), updatedAt: timestamp('updatedAt').notNull().defaultNow(), ipAddress: text('ipAddress'), userAgent: text('userAgent'), userId: text('userId').notNull() })
export const account = pgTable('account', { id: text('id').primaryKey(), accountId: text('accountId').notNull(), providerId: text('providerId').notNull(), userId: text('userId').notNull(), accessToken: text('accessToken'), refreshToken: text('refreshToken'), idToken: text('idToken'), accessTokenExpiresAt: timestamp('accessTokenExpiresAt'), refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'), scope: text('scope'), issuer: text('issuer'), password: text('password'), createdAt: timestamp('createdAt').notNull().defaultNow(), updatedAt: timestamp('updatedAt').notNull().defaultNow() })
export const verification = pgTable('verification', { id: text('id').primaryKey(), identifier: text('identifier').notNull(), value: text('value').notNull(), expiresAt: timestamp('expiresAt').notNull(), createdAt: timestamp('createdAt').notNull().defaultNow(), updatedAt: timestamp('updatedAt').notNull().defaultNow() })
export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameId: text('name_id').notNull(),
  nameEn: text('name_en').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  categoryId: text('category_id'),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').default(''),
  specs: jsonb('specs').$type<Record<string, string>>().default({}),
  depositCents: integer('deposit_cents').notNull().default(0),
  depositRequired: boolean('deposit_required').notNull().default(false),
  defaultFulfillment: text('default_fulfillment').notNull().default('pickup'),
  imageUrl: text('image_url'),
  gallery: jsonb('gallery').$type<string[]>().default([]),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  noindex: boolean('noindex').notNull().default(false),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const productImages = pgTable('product_images', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  url: text('url').notNull(),
  altText: text('alt_text'),
  sortOrder: integer('sort_order').notNull().default(0),
})

export type PricingRuleKind = 'daily' | 'weekly' | 'monthly' | 'weekend' | 'seasonal' | 'promo' | 'custom'
export const rentalPricingRules = pgTable('rental_pricing_rules', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  kind: text('kind').$type<PricingRuleKind>().notNull(),
  label: text('label').notNull(),
  // For daily: centsPerDay. For weekly/monthly packages: packageCents + centsPerExtraDay.
  centsPerDay: integer('cents_per_day').notNull().default(0),
  packageCents: integer('package_cents').notNull().default(0),
  // For weekend: applies to specific weekdays (0=Sun..6=Sat).
  weekdays: jsonb('weekdays').$type<number[]>().default([]),
  // For seasonal / promo: optional date bounds.
  startsOn: timestamp('starts_on'),
  endsOn: timestamp('ends_on'),
  active: boolean('active').notNull().default(true),
  priority: integer('priority').notNull().default(0),   // lowest wins when multiple apply
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [index('price_rule_product_idx').on(t.productId)])
export const rentalAddOns = pgTable('rental_add_ons', {
  id: text('id').primaryKey(),
  nameId: text('name_id').notNull(),
  nameEn: text('name_en').notNull(),
  centsPerDay: integer('cents_per_day').notNull().default(0),
  centsPerRental: integer('cents_per_rental').notNull().default(0),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const productAddOns = pgTable('product_add_ons', {
  productId: text('product_id').notNull(),
  addOnId: text('add_on_id').notNull(),
}, (t) => [index('pa_product_idx').on(t.productId)])

// --- Physical devices ---------------------------------------------------------
export const devices = pgTable('devices', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  assetCode: text('asset_code').notNull().unique(),   // e.g. GS-IP13-001
  serialNumber: text('serial_number'),
  imei: text('imei'),
  imei2: text('imei2'),
  status: deviceStatusEnum('status').notNull().default('available'),
  condition: text('condition').notNull().default('excellent'),
  color: text('color'),
  storage: text('storage'),
  batteryHealth: integer('battery_health'),
  purchaseDate: timestamp('purchase_date'),
  purchasePriceCents: integer('purchase_price_cents'),
  currentBookingId: text('current_booking_id'),
  lastMaintenanceAt: timestamp('last_maintenance_at'),
  nextMaintenanceAt: timestamp('next_maintenance_at'),
  lastInspectedAt: timestamp('last_inspected_at'),
  notes: text('notes'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [index('device_product_idx').on(t.productId), index('device_status_idx').on(t.status)])

export const deviceAccessories = pgTable('device_accessories', {
  id: text('id').primaryKey(),
  deviceId: text('device_id').notNull(),
  name: text('name').notNull(),
  count: integer('count').notNull().default(1),
})

export const deviceImages = pgTable('device_images', {
  id: text('id').primaryKey(),
  deviceId: text('device_id').notNull(),
  url: text('url').notNull(),
  kind: text('kind').notNull().default('condition'),  // condition, before, after
  capturedAt: timestamp('captured_at').notNull().defaultNow(),
})

export const deviceConditionReports = pgTable('device_condition_reports', {
  id: text('id').primaryKey(),
  deviceId: text('device_id').notNull(),
  bookingId: text('booking_id'),
  kind: text('kind').notNull().default('checkout'),   // checkout | checkin | periodic
  condition: text('condition').notNull(),
  notes: text('notes'),
  createdById: text('created_by_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [index('condition_device_idx').on(t.deviceId)])
export const deviceMaintenance = pgTable('device_maintenance', {
  id: text('id').primaryKey(),
  deviceId: text('device_id').notNull(),
  type: text('type').notNull().default('repair'),
  description: text('description').notNull(),
  costCents: integer('cost_cents').notNull().default(0),
  status: text('status').notNull().default('open'),  // open | in_progress | done
  scheduledAt: timestamp('scheduled_at'),
  completedAt: timestamp('completed_at'),
  createdById: text('created_by_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const deviceDamageReports = pgTable('device_damage_reports', {
  id: text('id').primaryKey(),
  deviceId: text('device_id').notNull(),
  bookingId: text('booking_id'),
  description: text('description').notNull(),
  severity: text('severity').notNull().default('minor'),
  chargeCents: integer('charge_cents').notNull().default(0),
  resolved: boolean('resolved').notNull().default(false),
  createdById: text('created_by_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const availabilityBlocks = pgTable('availability_blocks', {
  id: text('id').primaryKey(),
  deviceId: text('device_id').notNull(),
  reason: text('reason').notNull(),
  startsOn: timestamp('starts_on').notNull(),
  endsOn: timestamp('ends_on').notNull(),
  createdById: text('created_by_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [index('avail_block_device_idx').on(t.deviceId)])

// --- Customers / CRM ----------------------------------------------------------
export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  /** Auth account linked to this customer (§54). Null for walk-in / CRM-only customers. */
  userId: text('user_id').unique(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  idType: text('id_type'),                // passport | ktp | driving_license
  idNumber: text('id_number'),
  idVerified: boolean('id_verified').notNull().default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [index('customer_phone_idx').on(t.phone)])

export const customerDocuments = pgTable('customer_documents', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull(),
  url: text('url').notNull(),
  kind: text('kind').notNull().default('id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const customerTags = pgTable('customer_tags', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull(),
  tag: text('tag').notNull(),
})

export const leads = pgTable('leads', {
  id: text('id').primaryKey(),
  name: text('name'),
  phone: text('phone'),
  email: text('email'),
  source: text('source').notNull().default('website'),
  interest: text('interest'),
  notes: text('notes'),
  status: text('status').notNull().default('new'),  // new | contacted | qualified | won | lost
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
export const bookings = pgTable('bookings', {
  id: text('id').primaryKey(),
  number: text('number').notNull().unique(),          // GS-YYYYMMDD-NNN
  customerId: text('customer_id').notNull(),
  channel: channelEnum('channel').notNull().default('online'),
  status: bookingStatusEnum('status').notNull().default('pending'),
  fulfillment: text('fulfillment').notNull().default('pickup'),   // pickup | delivery
  returnMethod: text('return_method').notNull().default('return_to_location'),
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at').notNull(),
  deliveryAddress: text('delivery_address'),
  recipientName: text('recipient_name'),
  recipientPhone: text('recipient_phone'),
  deliveryNotes: text('delivery_notes'),
  deliveryFeeCents: integer('delivery_fee_cents').notNull().default(0),
  discountCents: integer('discount_cents').notNull().default(0),
  discountReason: text('discount_reason'),
  rentalSubtotalCents: integer('rental_subtotal_cents').notNull().default(0),
  totalCents: integer('total_cents').notNull(),
  depositCents: integer('deposit_cents').notNull().default(0),
  notes: text('notes'),
  createdById: text('created_by_id'),                  // staff who created walk-in
  confirmedAt: timestamp('confirmed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('booking_customer_idx').on(t.customerId),
  index('booking_status_idx').on(t.status),
  index('booking_dates_idx').on(t.startsAt, t.endsAt),
])

export const bookingItems = pgTable('booking_items', {
  id: text('id').primaryKey(),
  bookingId: text('booking_id').notNull(),
  productId: text('product_id').notNull(),
  addOnId: text('add_on_id'),
  quantity: integer('quantity').notNull().default(1),
  // Historical snapshot (spec §58) — never recomputed from live prices.
  unitPriceCents: integer('unit_price_cents').notNull(),
  priceRuleKind: text('price_rule_kind'),
  priceRuleLabel: text('price_rule_label'),
  addOnCents: integer('add_on_cents').notNull().default(0),
  lineTotalCents: integer('line_total_cents').notNull(),
  productNameSnapshot: text('product_name_snapshot'),
}, (t) => [index('booking_item_booking_idx').on(t.bookingId)])

export const bookingDeviceAllocations = pgTable('booking_device_allocations', {
  id: text('id').primaryKey(),
  bookingId: text('booking_id').notNull(),
  deviceId: text('device_id').notNull(),
  assignedById: text('assigned_by_id'),
  assignedAt: timestamp('assigned_at').notNull().defaultNow(),
  releasedAt: timestamp('released_at'),
}, (t) => [
  index('alloc_booking_idx').on(t.bookingId),
  index('alloc_device_idx').on(t.deviceId),
])

export const bookingExtensions = pgTable('booking_extensions', {
  id: text('id').primaryKey(),
  bookingId: text('booking_id').notNull(),
  deviceId: text('device_id'),
  previousEndsAt: timestamp('previous_ends_at').notNull(),
  newEndsAt: timestamp('new_ends_at').notNull(),
  additionalCents: integer('additional_cents').notNull().default(0),
  reason: text('reason'),
  createdById: text('created_by_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const bookingNotes = pgTable('booking_notes', {
  id: text('id').primaryKey(),
  bookingId: text('booking_id').notNull(),
  authorId: text('author_id'),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
// --- Check-in / check-out / inspection ----------------------------------------
export const deviceCheckouts = pgTable('device_checkouts', {
  id: text('id').primaryKey(),
  bookingId: text('booking_id').notNull(),
  deviceId: text('device_id').notNull(),
  condition: text('condition').notNull(),
  conditionsMet: boolean('conditions_met').notNull().default(false),
  notes: text('notes'),
  checkedOutById: text('checked_out_by_id').notNull(),
  checkedOutAt: timestamp('checked_out_at').notNull().defaultNow(),
})

export const deviceCheckins = pgTable('device_checkins', {
  id: text('id').primaryKey(),
  bookingId: text('booking_id').notNull(),
  deviceId: text('device_id').notNull(),
  condition: text('condition').notNull(),
  missingAccessories: jsonb('missing_accessories').$type<string[]>().default([]),
  damageNoted: boolean('damage_noted').notNull().default(false),
  notes: text('notes'),
  checkedInById: text('checked_in_by_id').notNull(),
  checkedInAt: timestamp('checked_in_at').notNull().defaultNow(),
})

export const inspectionChecklists = pgTable('inspection_checklists', {
  id: text('id').primaryKey(),
  deviceId: text('device_id').notNull(),
  checkinId: text('checkin_id'),
  checkoutId: text('checkout_id'),
  passed: boolean('passed').notNull().default(false),
  items: jsonb('items').$type<{ label: string; ok: boolean; note?: string }[]>().default([]),
  inspectedById: text('inspected_by_id'),
  inspectedAt: timestamp('inspected_at').notNull().defaultNow(),
})

// --- Financials ----------------------------------------------------------------
export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  bookingId: text('booking_id').notNull(),
  method: text('method').notNull().default('cash'),  // cash | transfer | ewallet | qris | gateway
  amountCents: integer('amount_cents').notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  kind: text('kind').notNull().default('rental'),    // rental | deposit | late_fee | damage
  reference: text('reference'),
  receivedAt: timestamp('received_at'),
  createdById: text('created_by_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [index('payment_booking_idx').on(t.bookingId)])

export const deposits = pgTable('deposits', {
  id: text('id').primaryKey(),
  bookingId: text('booking_id').notNull(),
  amountCents: integer('amount_cents').notNull(),
  status: depositStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const depositTransactions = pgTable('deposit_transactions', {
  id: text('id').primaryKey(),
  depositId: text('deposit_id').notNull(),
  kind: text('kind').notNull().default('held'),      // held | returned | forfeited
  amountCents: integer('amount_cents').notNull(),
  note: text('note'),
  createdById: text('created_by_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const lateFees = pgTable('late_fees', {
  id: text('id').primaryKey(),
  bookingId: text('booking_id').notNull(),
  deviceId: text('device_id'),
  daysLate: integer('days_late').notNull(),
  amountCents: integer('amount_cents').notNull(),
  waived: boolean('waived').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const damageCharges = pgTable('damage_charges', {
  id: text('id').primaryKey(),
  bookingId: text('booking_id'),
  deviceId: text('device_id').notNull(),
  description: text('description').notNull(),
  amountCents: integer('amount_cents').notNull(),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// --- Invoicing / agreements ----------------------------------------------------
export const invoiceTemplates = pgTable('invoice_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  bodyHtml: text('body_html').notNull(),
  settingsJson: jsonb('settings_json').$type<Record<string, string>>().default({}),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  number: text('number').notNull().unique(),
  bookingId: text('booking_id'),
  customerId: text('customer_id'),
  templateId: text('template_id'),
  totalCents: integer('total_cents').notNull(),
  status: text('status').notNull().default('unpaid'),
  dueAt: timestamp('due_at'),
  issuedAt: timestamp('issued_at').notNull().defaultNow(),
  createdById: text('created_by_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const agreementTemplates = pgTable('agreement_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  version: integer('version').notNull().default(1),
  bodyHtml: text('body_html').notNull(),
  active: boolean('active').notNull().default(true),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const rentalAgreements = pgTable('rental_agreements', {
  id: text('id').primaryKey(),
  number: text('number').notNull().unique(),
  bookingId: text('booking_id').notNull(),
  templateId: text('template_id'),
  templateVersion: integer('template_version').notNull().default(1),
  contentHtml: text('content_html'),
  status: text('status').notNull().default('draft'),  // draft | signed | printed
  generatedById: text('generated_by_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const agreementAcceptances = pgTable('agreement_acceptances', {
  id: text('id').primaryKey(),
  agreementId: text('agreement_id').notNull(),
  bookingId: text('booking_id').notNull(),
  version: integer('version').notNull(),
  accepted: boolean('accepted').notNull().default(false),
  method: text('method').notNull().default('online'),  // online | in_person
  acceptedAt: timestamp('accepted_at'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
})

// --- CMS / config --------------------------------------------------------------
export const cmsPages = pgTable('cms_pages', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  sections: jsonb('sections').$type<Record<string, unknown>[]>().default([]),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  ogImage: text('og_image'),
  noindex: boolean('noindex').notNull().default(false),
  active: boolean('active').notNull().default(true),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const faq = pgTable('faq', {
  id: text('id').primaryKey(),
  questionId: text('question_id').notNull(),
  questionEn: text('question_en').notNull(),
  answerId: text('answer_id').notNull(),
  answerEn: text('answer_en').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  active: boolean('active').notNull().default(true),
})

export const testimonials = pgTable('testimonials', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  rating: integer('rating').notNull().default(5),
  quoteId: text('quote_id').notNull(),
  quoteEn: text('quote_en').notNull(),
  active: boolean('active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const settings = pgTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
// Convenience typed helper for settings reads.
export const DEFAULT_SETTINGS: Record<string, string> = {
  whatsapp_number: '628123456789',
  business_name: 'Go-Sewa',
  business_address: 'Jl. Raya Seminyak No. 12, Bali, Indonesia',
  business_email: 'hello@gosewa.id',
  /** Company profile / content-CMS fields (§42) — editable from /admin/settings. */
  phone_number: '',
  instagram_url: '',
  logo_url: '',
  maps_url: '',
  footer_text: 'Better gear for better stories. Made with care in Bali.',
  default_language: 'id',
  minimum_rental_days: '1',
  maximum_rental_days: '30',
  turnaround_hours: '4',
  booking_advance_days: '0',
  delivery_fee_cents: '30000',
  late_fee_cents_per_day: '50000',
  currency: 'IDR',
  /** Identity document (jaminan) policy — §19, §2528. Types: ktp,sim,passport. */
  identity_document_required: 'true',
  identity_document_types: 'ktp,sim,passport',
}

// --- Ops / audit ---------------------------------------------------------------
export const activityLogs = pgTable('activity_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  action: text('action').notNull(),
  entity: text('entity'),
  entityId: text('entity_id'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [index('log_entity_idx').on(t.entity, t.entityId)])

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  kind: text('kind').notNull().default('info'),
  title: text('title').notNull(),
  body: text('body'),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// --- Types ---------------------------------------------------------------------
export type Product = typeof products.$inferSelect
export type Booking = typeof bookings.$inferSelect
export type BookingItem = typeof bookingItems.$inferSelect
export type Device = typeof devices.$inferSelect
export type Customer = typeof customers.$inferSelect
