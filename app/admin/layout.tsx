import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, isStaff } from '@/lib/services/auth'
import AdminShell from '@/components/admin/admin-shell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentUser()
  if (!current) redirect('/sign-in')
  if (!isStaff(current.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f1ea] px-6 text-[#173b3b]">
        <div className="max-w-sm rounded-2xl border border-[#173b3b]/10 bg-white p-8 text-center">
          <h1 className="font-serif text-2xl font-bold">Access denied</h1>
          <p className="mt-2 text-sm text-[#173b3b]/60">
            Your account does not have staff permissions for the Go-Sewa admin console.
          </p>
          <Link href="/" className="mt-5 inline-block rounded-full bg-[#173b3b] px-5 py-2.5 text-xs font-bold text-white">Back to storefront</Link>
        </div>
      </div>
    )
  }
  return (
    <AdminShell user={{ name: current.name, role: current.role }}>
      {children}
    </AdminShell>
  )
}