import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import StaffUsers from '@/components/admin/staff-users'
import { getCurrentUser } from '@/lib/services/auth'
import { listStaffUsers } from '@/lib/services/users'

export const metadata: Metadata = {
  title: 'Go-Sewa Admin — Staff accounts',
  description: 'Manage staff accounts and roles.',
}

export const dynamic = 'force-dynamic'

export default async function StaffUsersPage() {
  const current = await getCurrentUser()
  if (!current) redirect('/sign-in')
  // Owner-only (§63 user management).
  if (current.role !== 'owner') redirect('/admin')

  const users = await listStaffUsers()

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#173b3b]">
      <div className="px-4 py-8 sm:px-6 xl:px-10">
        <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">
          <Link href="/admin" className="hover:underline">Admin</Link> /{' '}
          <Link href="/admin/settings" className="hover:underline">Settings</Link> / Staff
        </p>
        <h1 className="mt-2 font-serif text-3xl tracking-tight">Staff accounts</h1>
        <p className="mt-1 max-w-xl text-sm text-[#173b3b]/60">
          Customers book without an account — only staff sign in. Roles: owner (full control), admin, staff (bookings &amp; handover). You cannot change your own role, and the last owner cannot be demoted.
        </p>
        <div className="mt-6">
          <StaffUsers users={users} currentUserId={current.id} />
        </div>
      </div>
    </div>
  )
}
