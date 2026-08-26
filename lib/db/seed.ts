import { eq } from 'drizzle-orm'
import { db } from './index'
import {
  categories, products, rentalPricingRules, rentalAddOns, productCategories,
  devices, deviceMaintenance, deviceDamageReports, customers, bookings, bookingItems,
  bookingDeviceAllocations, settings, cmsPages, faq, testimonials, leads,
  invoiceTemplates, agreementTemplates, invoices, rentalAgreements,
  deposits, deviceCheckouts, deviceCheckins,
} from './schema'

const uid = (): string => crypto.randomUUID()
const now = (): Date => new Date()

/**
 * Seed the database with realistic Indonesian demo data (spec §74/§75).
 * Intended to run once against a fresh schema. Run:  pnpm db:seed
 */
export async function seed(): Promise<void> {
  // --- Settings ---------------------------------------------------------------
  for (const [key, value] of [
    ['whatsapp_number', '628123456789'],
    ['business_name', 'Go-Sewa'],
    ['favicon_url', '/favicon.svg'],
    ['business_address', 'Jl. Raya Seminyak No. 12, Bali, Indonesia'],
    ['business_email', 'hello@gosewa.id'],
    ['phone_number', '+62 812 3456 7890'],
    ['instagram_url', 'https://instagram.com/gosewa.id'],
    ['maps_url', 'https://maps.google.com/?q=Seminyak,Bali'],
    ['footer_text', 'Better gear for better stories. Made with care in Bali.'],
    ['minimum_rental_days', '1'],
    ['turnaround_hours', '4'],
    ['delivery_fee_cents', '30000'],
    ['late_fee_cents_per_day', '50000'],
  ] as const) {
    await db.insert(settings).values({ id: uid(), key, value, updatedAt: now() })
  }

  // --- Categories --------------------------------------------------------------
  const categorySlugToId: Record<string, string> = {}
  for (const [slug, nameId, nameEn, sortOrder] of [
    ['smartphones', 'Smartphone', 'Smartphones', 1],
    ['cameras', 'Kamera', 'Cameras', 2],
    ['action-cameras', 'Action Camera', 'Action Cameras', 3],
    ['360-cameras', 'Kamera 360', '360 Cameras', 4],
    ['accessories', 'Aksesoris', 'Accessories', 5],
  ] as const) {
    const id = uid()
    await db.insert(categories).values({ id, slug, nameId, nameEn, sortOrder, showInNav: true, active: true, createdAt: now() })
    categorySlugToId[slug] = id
  }

  // --- Products + daily pricing rules -------------------------------------------
  const prod = async (slug: string, name: string, category: string, deposit: number, perDay: number, desc: string, depositRequired = false) => {
    const id = uid()
    await db.insert(products).values({
      id, slug, categoryId: categorySlugToId[category], name, description: desc,
      depositCents: deposit, depositRequired, defaultFulfillment: 'pickup', imageUrl: '', gallery: [],
      specs: {}, active: true, createdAt: now(), updatedAt: now(),
    })
    await db.insert(rentalPricingRules).values({
      id: uid(), productId: id, kind: 'daily', label: 'Harian / Daily',
      centsPerDay: perDay, packageCents: 0, priority: 0,
    })
    return id
  }

  const iphone15 = await prod('iphone-15-pro', 'iPhone 15 Pro', 'smartphones', 1_500_000, 150_000,
    'Flagship dengan kamera pro dan titanium.', true)
  const iphone13 = await prod('iphone-13', 'iPhone 13', 'smartphones', 1_000_000, 100_000,
    'Smartphone premium yang seimbang untuk kamera dan performa.')
  const samsung = await prod('samsung-galaxy-s24', 'Samsung Galaxy S24', 'smartphones', 1_200_000, 130_000,
    'Flagship Android dengan kamera serbaguna.')
  const gopro = await prod('gopro-hero-12', 'GoPro HERO 12', 'action-cameras', 1_500_000, 120_000,
    'Action camera tahan air 4K untuk petualangan.')
  const insta = await prod('insta360-x3', 'Insta360 X3', '360-cameras', 2_000_000, 180_000,
    'Kamera 360 dengan stitching otomatis.')
  const dji = await prod('dji-osmo-pocket-3', 'DJI Osmo Pocket 3', 'cameras', 1_800_000, 200_000,
    'Kamera genggam dengan gimbal terintegrasi.')
  const mirrorless = await prod('sony-a7v', 'Sony A7 V', 'cameras', 3_000_000, 250_000,
    'Mirrorless full-frame untuk kualitas maksimal.')
  const gimbal = await prod('dji-rs-3-gimbal', 'DJI RS 3 Gimbal', 'accessories', 1_000_000, 90_000,
    'Gimbal stabilizer profesional untuk kamera mirrorless.')

  // Demo many-to-many categories (§5): action/360 cams also live under Cameras.
  await db.insert(productCategories).values([
    { productId: gopro, categoryId: categorySlugToId['cameras'] },
    { productId: insta, categoryId: categorySlugToId['cameras'] },
    { productId: gimbal, categoryId: categorySlugToId['cameras'] },
  ]).onConflictDoNothing()

  // Save top-level ids for the booking section.
  const deviceProductIds = { iphone15, gopro, insta, dji, iphone13, samsung, mirrorless, gimbal }

  // --- Physical devices -----------------------------------------------------------
  // Individual tracked units across all products → 20 physical asset records.
  const deviceSets: [string, [string, string][]][] = [
    [deviceProductIds.iphone15, [['GS-IP15-001', 'available'], ['GS-IP15-002', 'rented'], ['GS-IP15-003', 'inspection']]],
    [deviceProductIds.iphone13, [['GS-IP13-001', 'available'], ['GS-IP13-002', 'available'], ['GS-IP13-003', 'maintenance']]],
    [deviceProductIds.samsung, [['GS-SGS24-001', 'available'], ['GS-SGS24-002', 'rented']]],
    [deviceProductIds.gopro, [['GS-GP12-001', 'available'], ['GS-GP12-002', 'rented'], ['GS-GP12-003', 'maintenance']]],
    [deviceProductIds.insta, [['GS-X3-001', 'available'], ['GS-X3-002', 'available'], ['GS-X3-003', 'damaged'], ['GS-X3-004', 'rented']]],
    [deviceProductIds.dji, [['GS-DJI-001', 'reserved'], ['GS-DJI-002', 'available']]],
    [deviceProductIds.mirrorless, [['GS-A7V-001', 'reserved'], ['GS-A7V-002', 'available']]],
    [deviceProductIds.gimbal, [['GS-RS3-001', 'available'], ['GS-RS3-002', 'inspection']]],
  ]
  for (const [productId, list] of deviceSets) {
    for (const [assetCode, status] of list) {
      await db.insert(devices).values({
        id: uid(), productId, assetCode, serialNumber: `SER-${assetCode}`, imei: `IMEI-${assetCode}`,
        status: status as never, condition: 'excellent', color: 'Black', storage: '128GB',
        batteryHealth: 95, active: true, createdAt: now(), updatedAt: now(),
      })
    }
  }

  // --- Customers -------------------------------------------------------------------
  const cust = async (name: string, phone: string) => {
    const id = uid()
    await db.insert(customers).values({ id, name, phone, createdAt: now(), updatedAt: now() })
    return id
  }
  const maya = await cust('Maya Putri', '+6281244558901')
  const ethan = await cust('Ethan Wong', '+6590881204')
  const dimas = await cust('Dimas Pratama', '+6281233001101')
  const nadia = await cust('Nadia Sari', '+6281199223300')
  const budi = await cust('Budi Santoso', '+6281377788899')
  const clara = await cust('Clara Wijaya', '+6285600011122')
  const jonas = await cust('Jonas Weber', '+4915112345678')
  const ayu = await cust('Ayu Lestari', '+6281993344556')

  // --- Add-ons (§74: 8+ accessories) ------------------------------------------------
  for (const [, nameId, nameEn, perDay] of [
    ['card', 'Kartu memori', 'Memory card', 15000],
    ['battery', 'Baterai ekstra', 'Extra battery', 10000],
    ['tripod', 'Tripod', 'Tripod', 5000],
    ['powerbank', 'Power bank', 'Power bank', 8000],
    ['mic', 'Mikrofon wireless', 'Wireless microphone', 25000],
    ['waterproof-case', 'Casing anti air', 'Waterproof case', 12000],
    ['helmet-mount', 'Mount helm', 'Helmet mount', 7000],
    ['selfie-stick', 'Tongsis', 'Selfie stick', 6000],
    ['fast-charger', 'Charger cepat', 'Fast charger', 9000],
  ] as const) {
    await db.insert(rentalAddOns).values({ id: uid(), nameId, nameEn, centsPerDay: perDay, centsPerRental: 0, active: true })
  }

  // --- Maintenance (§74: 3+ records) + damage report ------------------------------
  const devByAsset = async (assetCode: string) =>
    (await db.select({ id: devices.id }).from(devices).where(eq(devices.assetCode, assetCode)))[0]?.id ?? ''

  const maintenanceRows: [string, string, string, string][] = [
    ['GS-IP13-003', 'repair', 'Battery replacement', 'in_progress'],
    ['GS-GP12-003', 'service', 'Lens cleaning + firmware update', 'scheduled'],
    ['GS-X3-003', 'repair', 'Cracked screen replacement', 'open'],
  ]
  for (const [asset, type, description, status] of maintenanceRows) {
    const deviceId = await devByAsset(asset)
    if (deviceId) {
      await db.insert(deviceMaintenance).values({
        id: uid(), deviceId, type, description, status, scheduledAt: new Date(),
      })
    }
  }
  const damagedId = await devByAsset('GS-X3-003')
  if (damagedId) {
    await db.insert(deviceDamageReports).values({
      id: uid(), deviceId: damagedId, description: 'Screen cracked after drop during rental',
      severity: 'major', chargeCents: 750_000, resolved: false,
    })
  }

  // --- Bookings (mixed statuses; 2 via walk-in/in-store, spec §19B) ---------------
  const ago = (daysFromNow: number): Date => {
    const d = new Date()
    d.setDate(d.getDate() + daysFromNow)
    return d
  }
  const book = async (b: {
    productId: string; asset: string; channel: 'online' | 'in_store' | 'whatsapp';
    status: string; start: number; end: number; qty: number; perDay: number; deposit: number; customerId: string
  }): Promise<string> => {
    const id = uid()
    const days = b.end - b.start
    const subtotal = b.qty * b.perDay * Math.max(1, days)
    const dev = b.asset
      ? await db.select({ id: devices.id }).from(devices).where(eq(devices.assetCode, b.asset))
      : []
    if (b.asset && !dev[0]) return ''
    await db.insert(bookings).values({
      id, number: `GS-${todayNumber()}-${Math.floor(100 + Math.random() * 900)}`,
      customerId: b.customerId, channel: b.channel as never, status: b.status as never,
      fulfillment: 'pickup', returnMethod: 'return_to_location',
      startsAt: ago(b.start), endsAt: ago(b.end), deliveryFeeCents: 0, discountCents: 0,
      discountReason: null, rentalSubtotalCents: subtotal, totalCents: subtotal, depositCents: b.deposit,
      notes: null, createdById: b.channel === 'in_store' ? 'staff-demo' : null,
      createdAt: now(), updatedAt: now(),
    })
    await db.insert(bookingItems).values({
      id: uid(), bookingId: id, productId: b.productId, addOnId: null, quantity: b.qty,
      unitPriceCents: b.perDay, priceRuleKind: 'daily', priceRuleLabel: 'Harian / Daily',
      addOnCents: 0, lineTotalCents: subtotal, productNameSnapshot: b.asset || b.productId,
    })
    if (dev[0]) {
      // Terminal bookings no longer hold the unit (spec §81 data consistency).
      const released = ['completed', 'cancelled', 'refunded'].includes(b.status)
      await db.insert(bookingDeviceAllocations).values({
        id: uid(), bookingId: id, deviceId: dev[0].id, releasedAt: released ? now() : null,
      })
    }
    return id
  }

  const bActive1 = await book({ productId: deviceProductIds.iphone15, asset: 'GS-IP15-002', channel: 'online', status: 'active_rental', start: -1, end: 2, qty: 1, perDay: 150000, deposit: 1500000, customerId: maya })
  const bActive2 = await book({ productId: deviceProductIds.gopro, asset: 'GS-GP12-002', channel: 'whatsapp', status: 'active_rental', start: -1, end: 2, qty: 1, perDay: 120000, deposit: 1500000, customerId: ethan })
  const bActive3 = await book({ productId: deviceProductIds.samsung, asset: 'GS-SGS24-002', channel: 'online', status: 'active_rental', start: -2, end: 1, qty: 1, perDay: 130000, deposit: 1200000, customerId: budi })
  const bOverdue = await book({ productId: deviceProductIds.insta, asset: 'GS-X3-004', channel: 'online', status: 'overdue', start: -6, end: -1, qty: 1, perDay: 180000, deposit: 2000000, customerId: dimas })
  const bUpcoming = await book({ productId: deviceProductIds.dji, asset: 'GS-DJI-001', channel: 'in_store', status: 'confirmed', start: 1, end: 4, qty: 1, perDay: 200000, deposit: 1800000, customerId: dimas })
  const bUpcoming2 = await book({ productId: deviceProductIds.mirrorless, asset: 'GS-A7V-001', channel: 'online', status: 'confirmed', start: 3, end: 6, qty: 1, perDay: 250000, deposit: 3000000, customerId: clara })
  const bInspect1 = await book({ productId: deviceProductIds.iphone15, asset: 'GS-IP15-003', channel: 'in_store', status: 'inspection', start: -6, end: -3, qty: 1, perDay: 150000, deposit: 1500000, customerId: nadia })
  const bInspect2 = await book({ productId: deviceProductIds.gimbal, asset: 'GS-RS3-002', channel: 'whatsapp', status: 'inspection', start: -5, end: -2, qty: 1, perDay: 90000, deposit: 1000000, customerId: ayu })
  const bCompleted = await book({ productId: deviceProductIds.gopro, asset: 'GS-GP12-001', channel: 'online', status: 'completed', start: -20, end: -17, qty: 1, perDay: 120000, deposit: 1500000, customerId: maya })
  const bCompleted2 = await book({ productId: deviceProductIds.iphone13, asset: 'GS-IP13-002', channel: 'in_store', status: 'completed', start: -12, end: -9, qty: 1, perDay: 100000, deposit: 1000000, customerId: jonas })
  const bCancelled = await book({ productId: deviceProductIds.insta, asset: '', channel: 'online', status: 'cancelled', start: 2, end: 5, qty: 1, perDay: 180000, deposit: 2000000, customerId: ethan })
  const bPending = await book({ productId: deviceProductIds.gimbal, asset: 'GS-RS3-001', channel: 'online', status: 'pending', start: 5, end: 8, qty: 1, perDay: 90000, deposit: 1000000, customerId: ayu })

  // --- Deposits held for live rentals (§16/§18) -----------------------------------
  for (const [bookingId, amount] of [[bActive1, 1500000], [bActive2, 1500000], [bActive3, 1200000], [bOverdue, 2000000]] as const) {
    if (!bookingId) continue
    await db.insert(deposits).values({ id: uid(), bookingId, amountCents: amount, status: 'held', createdAt: now(), updatedAt: now() })
  }

  // --- Check-out records for live rentals (§23) ------------------------------------
  for (const [bookingId, asset] of [[bActive1, 'GS-IP15-002'], [bActive2, 'GS-GP12-002'], [bActive3, 'GS-SGS24-002'], [bOverdue, 'GS-X3-004']] as const) {
    if (!bookingId) continue
    const deviceId = await devByAsset(asset)
    if (!deviceId) continue
    await db.insert(deviceCheckouts).values({
      id: uid(), bookingId, deviceId, condition: 'excellent', conditionsMet: true,
      notes: 'Checked with customer, accessories complete.', checkedOutById: 'staff-demo',
      checkedOutAt: ago(2),
    })
  }

  // --- Check-in records for returned/inspected rentals (§24) ------------------------
  for (const [bookingId, asset, damage] of [
    [bCompleted, 'GS-GP12-001', false],
    [bCompleted2, 'GS-IP13-002', false],
    [bInspect1, 'GS-IP15-003', false],
    [bInspect2, 'GS-RS3-002', false],
  ] as const) {
    if (!bookingId) continue
    const deviceId = await devByAsset(asset)
    if (!deviceId) continue
    await db.insert(deviceCheckins).values({
      id: uid(), bookingId, deviceId, condition: 'good', missingAccessories: [],
      damageNoted: damage, notes: damage ? 'Minor scratch on frame.' : 'Returned complete.',
      checkedInById: 'staff-demo', checkedInAt: ago(1),
    })
  }

  // --- Invoices (§74: 5+) ------------------------------------------------------------
  const invoiceBookings: [string, number, string][] = [
    [bActive1, 450000, 'paid'],
    [bActive2, 360000, 'paid'],
    [bActive3, 390000, 'unpaid'],
    [bUpcoming, 600000, 'unpaid'],
    [bCompleted, 360000, 'paid'],
    [bCompleted2, 300000, 'paid'],
  ]
  let invSeq = 1
  for (const [bookingId, amount, status] of invoiceBookings) {
    if (!bookingId) continue
    await db.insert(invoices).values({
      id: uid(), number: `INV-${todayNumber()}-${String(invSeq++).padStart(3, '0')}`,
      bookingId, customerId: null, templateId: null, totalCents: amount, status,
      dueAt: ago(7), issuedAt: ago(7), createdById: 'staff-demo', createdAt: now(),
    })
  }

  // --- Rental agreements (§74: 3+) -----------------------------------------------------
  const agreementBookings: [string, string][] = [
    [bActive1, 'signed'], [bUpcoming, 'draft'], [bCompleted, 'signed'],
  ]
  let agrSeq = 1
  for (const [bookingId, status] of agreementBookings) {
    if (!bookingId) continue
    await db.insert(rentalAgreements).values({
      id: uid(), number: `AGR-${todayNumber()}-${String(agrSeq++).padStart(3, '0')}`,
      bookingId, templateId: null, templateVersion: 1,
      contentHtml: '<h1>RENTAL AGREEMENT</h1><p>Standard Go-Sewa terms.</p>',
      status, generatedById: 'staff-demo', createdAt: now(),
    })
  }

  // --- CMS / FAQ / testimonials / leads / templates ---------------------------------
  await db.insert(cmsPages).values({ id: uid(), slug: 'home', title: 'Home', sections: [], active: true, updatedAt: now() })
  await db.insert(faq).values({ id: uid(), questionId: 'q1', questionEn: 'How does rental work?', answerId: 'a1', answerEn: 'Pick a device, choose your dates, book, then pick up or get delivery.', sortOrder: 0 })
  await db.insert(faq).values({ id: uid(), questionId: 'q2', questionEn: 'Is a deposit required?', answerId: 'a2', answerEn: 'Yes, a refundable deposit is held and returned after the device comes back in good condition.', sortOrder: 1 })
  await db.insert(faq).values({ id: uid(), questionId: 'q3', questionEn: 'Do you offer delivery?', answerId: 'a3', answerEn: 'Yes, we deliver across Bali for a small fee. Pick-up from our studio is free.', sortOrder: 2 })
  await db.insert(faq).values({ id: uid(), questionId: 'q4', questionEn: 'What happens if the device is late?', answerId: 'a4', answerEn: 'A daily late fee applies per the terms you accept at checkout.', sortOrder: 3 })
  await db.insert(testimonials).values({ id: uid(), name: 'Maya', rating: 5, quoteId: 't1', quoteEn: 'Smooth, reliable, premium gear.', sortOrder: 0 })
  await db.insert(testimonials).values({ id: uid(), name: 'Lucas', rating: 5, quoteId: 't2', quoteEn: 'The action cam was spotless and check-in took two minutes.', sortOrder: 1 })
  await db.insert(testimonials).values({ id: uid(), name: 'Sari', rating: 4, quoteId: 't3', quoteEn: 'Great prices and helpful staff in Seminyak.', sortOrder: 2 })
  await db.insert(leads).values({ id: uid(), name: 'WhatsApp Lead', phone: '+628111222333', source: 'whatsapp', status: 'new' })
  await db.insert(leads).values({ id: uid(), name: 'Anna Kova', phone: '+79005001122', email: 'anna@example.com', source: 'instagram', interest: 'Insta360 X3 for a shoot', status: 'contacted' })
  await db.insert(leads).values({ id: uid(), name: 'Leo Martins', phone: '+5511987654321', source: 'website', interest: 'iPhone 15 Pro 3 days', status: 'quotation_sent' })
  await db.insert(leads).values({ id: uid(), name: 'Priya Nair', phone: '+919810001122', source: 'referral', interest: 'Sony A7 V + gimbal', status: 'booking_pending' })
  await db.insert(invoiceTemplates).values({ id: uid(), name: 'Default invoice', bodyHtml: '<h1>INVOICE</h1>{{items}}', settingsJson: {} })
  await db.insert(agreementTemplates).values({ id: uid(), name: 'Default agreement', version: 1, bodyHtml: '<h1>RENTAL AGREEMENT</h1>{{device}}', active: true, updatedAt: now() })
}

function todayNumber(): string {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}${m}${day}`
}