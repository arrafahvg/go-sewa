'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, UserPlus } from 'lucide-react'
import { createStaffUserAction, updateStaffRoleAction } from '@/app/actions/users'

type StaffUser = { id: string; name: string; email: string; role: string; createdAt: Date | string }

const ROLES = ['owner', 'admin', 'staff'] as const

const inputCls = 'mt-1 w-full rounded-lg border border-[#173b3b]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#387066]'

/**
 * Owner-only staff management (§63): create staff accounts and change roles.
 * Guards (own-role change, last-owner demotion) are enforced server-side.
 */
export default function StaffUsers({ users, currentUserId }: { users: StaffUser[]; currentUserId: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<string>('staff')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(''); setSuccess('')
    const res = await createStaffUserAction({ name, email, password, role })
    setBusy(false)
    if (!res.ok) { setError(res.error); return }
    setName(''); setEmail(''); setPassword(''); setRole('staff')
    setSuccess('Staff account created.')
    router.refresh()
  }

  async function changeRole(userId: string, next: string) {
    setBusy(true); setError(''); setSuccess('')
    const res = await updateStaffRoleAction({ userId, role: next })
    setBusy(false)
    if (!res.ok) { setError(res.error); return }
    setSuccess('Role updated.')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createUser} className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
        <h2 className="flex items-center gap-2 font-bold"><UserPlus size={17} /> Create staff account</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <label className="block text-xs font-bold text-[#173b3b]/60">Name
            <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
          </label>
          <label className="block text-xs font-bold text-[#173b3b]/60">Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} />
          </label>
          <label className="block text-xs font-bold text-[#173b3b]/60">Password (min. 8)
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required className={inputCls} />
          </label>
          <label className="block text-xs font-bold text-[#173b3b]/60">Role
            <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        </div>
        {error && <p role="alert" className="mt-3 text-sm font-bold text-[#a43d2b]">{error}</p>}
        {success && <p className="mt-3 flex items-center gap-1 text-sm font-bold text-[#27604a]"><Check size={14} /> {success}</p>}
        <button disabled={busy} className="mt-4 flex items-center gap-2 rounded-full bg-[#173b3b] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          {busy && <Loader2 size={15} className="animate-spin" />} Create account
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-[#173b3b]/10 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-[#f1eee7] text-xs text-[#173b3b]/50">
            <tr>{['Name', 'Email', 'Created', 'Role'].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-[#173b3b]/8">
                <td className="px-5 py-3.5 font-semibold">{u.name}{u.id === currentUserId && <span className="ml-2 rounded-full bg-[#e4eee8] px-2 py-0.5 text-[10px] font-bold text-[#27604a]">you</span>}</td>
                <td className="px-5 py-3.5 font-mono text-xs">{u.email}</td>
                <td className="px-5 py-3.5 text-xs text-[#173b3b]/55">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-3.5">
                  {u.id === currentUserId ? (
                    <span className="rounded-full bg-[#f1eee7] px-2.5 py-1 text-[11px] font-bold capitalize">{u.role}</span>
                  ) : (
                    <select
                      value={u.role}
                      disabled={busy}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      className="rounded-lg border border-[#173b3b]/15 bg-white px-2 py-1.5 text-xs font-bold capitalize"
                      aria-label={`Role for ${u.name}`}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
