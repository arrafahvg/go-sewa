import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import AccountManager from '@/components/account-manager'
import { getCurrentUser, isStaff } from '@/lib/services/auth'

export const metadata: Metadata = {
  title: 'My account — Go-Sewa',
  description: 'Manage your Go-Sewa account details.',
}

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const current = await getCurrentUser()
  if (!current) redirect('/sign-in')

  return (
    <div className="min-h-screen bg-[#f8f6f1] px-5 py-10 text-[#173b3b] lg:px-8">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">
          <Link href="/" className="hover:underline">Home</Link> / My account
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight">My account</h1>

        <div className="mt-6 rounded-2xl border border-[#173b3b]/10 bg-white p-6">
          <p className="font-bold">{current.name}</p>
          <p className="mt-1 text-sm text-[#173b3b]/55">{current.role === 'customer' ? 'Customer account' : `Staff account (${current.role})`}</p>
          {isStaff(current.role) && (
            <Link href="/admin" className="mt-3 inline-block rounded-full bg-[#173b3b] px-4 py-2 text-xs font-bold text-white">Open admin console</Link>
          )}
        </div>

        <AccountManager email={current.email} />

        <div className="mt-6">
          <Link
            href="/account/bookings"
            className="inline-block rounded-full bg-[#173b3b] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#173b3b]/85"
          >
            My bookings →
          </Link>
        </div>
      </div>
    </div>
  )
}
