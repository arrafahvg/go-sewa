'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut, Mail, KeyRound, MonitorSmartphone } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import type { Dictionary } from '@/lib/i18n/dictionaries'

const inputCls = 'mt-1 w-full rounded-xl border border-[#173b3b]/15 bg-white px-4 py-3 text-sm outline-none focus:border-[#e76f51]'

function Notice({ error, success }: { error?: string | null; success?: string | null }) {
  if (!error && !success) return null
  return (
    <p role={error ? 'alert' : undefined} className={`text-sm font-semibold ${error ? 'text-[#a43d2b]' : 'text-[#27604a]'}`}>
      {error ?? success}
    </p>
  )
}

export default function AccountManager({ email, dict }: { email: string; dict: Dictionary }) {
  const router = useRouter()

  async function signOut(everywhere: boolean) {
    if (everywhere) await authClient.revokeSessions()
    else await authClient.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="mt-6 space-y-6">
      <ChangeEmailForm currentEmail={email} dict={dict} />
      <ChangePasswordForm dict={dict} />
      <SessionsPanel onChanged={() => router.refresh()} dict={dict} />

      <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
        <h2 className="flex items-center gap-2 font-serif text-xl font-bold"><LogOut size={18} /> {dict.account.signOutTitle}</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={() => signOut(false)} className="rounded-full bg-[#173b3b] px-6 py-3 text-sm font-bold text-white">{dict.account.signOut}</button>
          <button onClick={() => signOut(true)} className="rounded-full border border-[#a43d2b]/40 px-6 py-3 text-sm font-bold text-[#a43d2b] hover:bg-[#f5d9d3]">{dict.account.signOutAllDevices}</button>
        </div>
      </div>
    </div>
  )
}

function ChangeEmailForm({ currentEmail, dict }: { currentEmail: string; dict: Dictionary }) {
  const [newEmail, setNewEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function submit() {
    setBusy(true); setError(null); setSuccess(null)
    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      setBusy(false); setError(dict.account.errorSameEmail); return
    }
    const res = await authClient.changeEmail({ newEmail })
    setBusy(false)
    if (res.error) {
      setError(dict.account.errorEmailUpdate)
      return
    }
    setSuccess(dict.account.emailUpdated)
    setNewEmail('')
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit() }} className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
      <h2 className="flex items-center gap-2 font-serif text-xl font-bold"><Mail size={18} /> {dict.account.emailTitle}</h2>
      <p className="mt-1 text-sm text-[#173b3b]/55">{dict.account.currentEmail} <span className="font-semibold">{currentEmail}</span></p>
      <label className="mt-4 block text-sm font-semibold">{dict.account.newEmail}
        <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={inputCls} placeholder="you@example.com" />
      </label>
      <div className="mt-4 space-y-2">
        <Notice error={error} success={success} />
      </div>
      <button disabled={busy} className="mt-2 flex items-center gap-2 rounded-full bg-[#173b3b] px-6 py-3 text-sm font-bold text-white disabled:opacity-60">
        {busy && <Loader2 size={15} className="animate-spin" />} {dict.account.updateEmail}
      </button>
    </form>
  )
}

function ChangePasswordForm({ dict }: { dict: Dictionary }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function submit() {
    setError(null); setSuccess(null)
    if (newPassword.length < 8) { setError(dict.account.errorPasswordLength); return }
    if (newPassword !== confirm) { setError(dict.account.errorPasswordMismatch); return }
    setBusy(true)
    // revokeOtherSessions: signing out other devices after a password change is good hygiene.
    const res = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })
    setBusy(false)
    if (res.error) {
      setError(dict.account.errorPasswordChange)
      return
    }
    setSuccess(dict.account.passwordChanged)
    setCurrentPassword(''); setNewPassword(''); setConfirm('')
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit() }} className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
      <h2 className="flex items-center gap-2 font-serif text-xl font-bold"><KeyRound size={18} /> {dict.account.passwordTitle}</h2>
      <div className="mt-4 grid gap-4">
        <label className="block text-sm font-semibold">{dict.account.currentPassword}
          <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputCls} autoComplete="current-password" />
        </label>
        <label className="block text-sm font-semibold">{dict.account.newPassword}
          <input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} autoComplete="new-password" />
        </label>
        <label className="block text-sm font-semibold">{dict.account.confirmPassword}
          <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} autoComplete="new-password" />
        </label>
      </div>
      <div className="mt-4 space-y-2">
        <Notice error={error} success={success} />
      </div>
      <button disabled={busy} className="mt-2 flex items-center gap-2 rounded-full bg-[#173b3b] px-6 py-3 text-sm font-bold text-white disabled:opacity-60">
        {busy && <Loader2 size={15} className="animate-spin" />} {dict.account.changePassword}
      </button>
    </form>
  )
}

type SessionInfo = { token: string; expiresAt: Date | string; ipAddress?: string | null; userAgent?: string | null }

function SessionsPanel({ onChanged, dict }: { onChanged: () => void; dict: Dictionary }) {
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null)
  const [busyToken, setBusyToken] = useState<string | null>(null)

  async function load() {
    const res = await authClient.listSessions()
    setSessions((res.data as SessionInfo[] | undefined) ?? [])
  }
  if (sessions === null) void load()

  async function revoke(token: string) {
    setBusyToken(token)
    await authClient.revokeSession({ token })
    setBusyToken(null)
    onChanged()
    await load()
  }

  return (
    <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
      <h2 className="flex items-center gap-2 font-serif text-xl font-bold"><MonitorSmartphone size={18} /> {dict.account.sessionsTitle}</h2>
      <p className="mt-1 text-sm text-[#173b3b]/55">{dict.account.sessionsSubtitle}</p>
      <ul className="mt-4 space-y-3">
        {(sessions ?? []).map((s) => (
          <li key={s.token} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#173b3b]/10 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{s.userAgent?.split(')')[0]?.replace(/^Mozilla\/5\.0 \(/, '') || dict.account.unknownDevice}</p>
              <p className="text-xs text-[#173b3b]/50">{s.ipAddress ?? dict.account.unknownLocation} · {dict.account.expiresOn.replace('{date}', new Date(s.expiresAt).toLocaleDateString())}</p>
            </div>
            <button onClick={() => revoke(s.token)} disabled={busyToken === s.token} className="rounded-full border border-[#a43d2b]/40 px-4 py-1.5 text-xs font-bold text-[#a43d2b] hover:bg-[#f5d9d3] disabled:opacity-50">
              {dict.account.revokeSession}
            </button>
          </li>
        ))}
        {sessions !== null && sessions.length === 0 && (
          <li className="text-sm text-[#173b3b]/50">{dict.account.noSessions}</li>
        )}
      </ul>
    </div>
  )
}
