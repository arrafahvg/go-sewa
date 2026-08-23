import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, customers } from '@/lib/db/schema'
import { logActivity, uid } from './audit'

/**
 * Leads (spec §33): prospective customers who enquired but have not booked yet.
 * Business logic stays server-side (§59); writes are audit-logged (§63).
 * A lead can be converted into a full customer record without re-entering info.
 */

export const LEAD_STATUSES = ['new', 'contacted', 'interested', 'quotation_sent', 'booking_pending', 'won', 'lost'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export type LeadInput = {
  name: string
  phone?: string | null
  email?: string | null
  source?: string
  interest?: string | null
  notes?: string | null
}

export async function listLeads(status?: string) {
  const rows = await db.select().from(leads).orderBy(desc(leads.createdAt))
  return status ? rows.filter((l) => l.status === status) : rows
}

export async function createLead(input: LeadInput, byUserId?: string | null) {
  if (!input.name?.trim()) throw new Error('Lead name is required.')
  const id = uid()
  await db.insert(leads).values({
    id,
    name: input.name.trim(),
    phone: input.phone || null,
    email: input.email || null,
    source: input.source ?? 'website',
    interest: input.interest ?? null,
    notes: input.notes ?? null,
  })
  await logActivity({ userId: byUserId, action: 'lead_created', entity: 'lead', entityId: id, metadata: { source: input.source ?? 'website' } })
  return id
}

export async function updateLeadStatus(id: string, status: string, byUserId?: string | null) {
  if (!LEAD_STATUSES.includes(status as LeadStatus)) throw new Error('Unknown lead status.')
  const updated = await db.update(leads).set({ status }).where(eq(leads.id, id)).returning({ id: leads.id })
  if (!updated.length) throw new Error('Lead not found.')
  await logActivity({ userId: byUserId, action: 'lead_status_changed', entity: 'lead', entityId: id, metadata: { status } })
  return id
}

/**
 * Convert a lead into a customer (spec §33: "convert to customer without manually
 * recreating information"). Marks the lead as won and returns the new customer id.
 */
export async function convertLeadToCustomer(id: string, byUserId?: string | null) {
  const lead = (await db.select().from(leads).where(eq(leads.id, id)).limit(1))[0]
  if (!lead) throw new Error('Lead not found.')

  const customerId = uid()
  await db.insert(customers).values({
    id: customerId,
    name: lead.name ?? 'Unnamed lead',
    phone: lead.phone ?? null,
    email: lead.email ?? null,
    notes: lead.notes ?? null,
  })
  await db.update(leads).set({ status: 'won' }).where(eq(leads.id, id))
  await logActivity({
    userId: byUserId, action: 'lead_converted', entity: 'lead', entityId: id,
    metadata: { customerId },
  })
  return customerId
}