import type { Metadata } from 'next'
import MaintenanceManager from '@/components/admin/maintenance'
import { listMaintenanceTasks } from '@/lib/services/devices'
import { getAdminDevices } from '@/lib/data/admin'

export const metadata: Metadata = {
  title: 'Go-Sewa Admin — Maintenance',
  description: 'Schedule and complete device maintenance, resolve damage reports.',
}

export const dynamic = 'force-dynamic'

export default async function MaintenancePage() {
  const [{ jobs, damage }, devices] = await Promise.all([listMaintenanceTasks(), getAdminDevices()])
  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#173b3b]">
      <MaintenanceManager
        jobs={jobs.map((j) => ({
          id: j.id, assetCode: j.assetCode, deviceStatus: j.deviceStatus,
          type: j.type, description: j.description, costCents: j.costCents, status: j.status,
          scheduledAt: j.scheduledAt ? j.scheduledAt.toISOString() : null,
          completedAt: j.completedAt ? j.completedAt.toISOString() : null,
        }))}
        damage={damage.map((d) => ({
          id: d.id, assetCode: d.assetCode, deviceStatus: d.deviceStatus,
          bookingId: d.bookingId, description: d.description, severity: d.severity,
          chargeCents: d.chargeCents, resolved: d.resolved,
        }))}
        devices={devices.map((d) => ({ id: d.id, assetCode: d.assetCode, status: d.status }))}
      />
    </div>
  )
}