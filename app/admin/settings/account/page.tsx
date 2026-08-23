import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import AccountManager from '@/components/account-manager'
import { getCurrentUser, isStaff } from '@/lib/services/auth'

export const metadata: Metadata = {
  title: 'Go-Sewa Admin — Account settings',
  description: 'Manage your Go-Sewa staff account email, password and sessions.',
}

export const dynamic = 'force-dynamic'

export default async function AdminAccountPage() {
  const current = await getCurrentUser()
  if (!current) redirect('/sign-in')
  if (!isStaff(current.role)) redirect('/admin')

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#173b3b]">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">
          <a href="/admin" className="hover:underline">Admin</a> /{' '}
          <a href="/admin/settings" className="hover:underline">Settings</a> / Account
        </p>
        <h1 className="mt-2 font-serif text-3xl tracking-tight">Account settings</h1>
        <div className="mt-6 rounded-2xl border border-[#173b3b]/10 bg-white p-6">
          <p className="font-bold">{current.name}</p>
          <p className="mt-1 text-sm text-[#173b3b]/55">Staff account ({current.role})</p>
        </div>
        <AccountManager email={current.email} />
      </div>
    </div>
  )
}
