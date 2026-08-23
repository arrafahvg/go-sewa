import type { Metadata } from 'next'
import LeadsManager from '@/components/admin/leads'
import { listLeads } from '@/lib/services/leads'

export const metadata: Metadata = {
  title: 'Go-Sewa Admin — Leads',
  description: 'Track and convert Go-Sewa rental leads.',
}

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const leads = await listLeads()
  return (
    <LeadsManager
      leads={leads.map((l) => ({
        id: l.id, name: l.name, phone: l.phone, email: l.email,
        source: l.source, interest: l.interest, notes: l.notes,
        status: l.status, createdAt: l.createdAt.toISOString(),
      }))}
    />
  )
}