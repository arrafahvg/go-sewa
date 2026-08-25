import Link from 'next/link'
import { Shield } from 'lucide-react'
import { getCurrentUser, isStaff } from '@/lib/services/auth'

/**
 * Server-rendered "Admin console" chip for the storefront header. Renders
 * nothing unless a staff session is active — customers never see it (§54).
 */
export default async function StaffAdminLink() {
  const current = await getCurrentUser()
  if (!current || !isStaff(current.role)) return null
  return (
    <Link
      href="/admin"
      className="flex items-center gap-1.5 rounded-full bg-[#173b3b] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#173b3b]/85"
    >
      <Shield size={13} /> Admin
    </Link>
  )
}
