import AuthForm from '@/components/auth-form'
import { needsOwnerBootstrap } from '@/lib/services/auth'

export const dynamic = 'force-dynamic'

export default async function SignInPage() {
  // First run: no staff account exists yet → offer the one-time owner bootstrap.
  const setup = await needsOwnerBootstrap()
  return <main className="flex min-h-screen items-center justify-center bg-[#f8f6f1] px-5 py-12 text-[#173b3b]"><AuthForm mode={setup ? 'owner-setup' : 'sign-in'} /></main>
}
