'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Plus, Wrench } from 'lucide-react'
import { formatMoney } from '@/lib/utils/money'
import {
  createMaintenanceAction, completeMaintenanceAction, reportDamageAction, resolveDamageAction,
} from '@/app/actions/maintenance'

type Device = { id: string; assetCode: string; status: string }
type Job = {
  id: string; assetCode: string; deviceStatus: string
  type: string; description: string; costCents: number; status: string
  scheduledAt: string | null; completedAt: string | null
}
type DamageRpt = {
  id: string; assetCode: string; deviceStatus: string
  bookingId: string | null; description: string; severity: string
  chargeCents: number; resolved: boolean
}

const JOB_TYPES = ['repair', 'service', 'cleaning', 'calibration', 'firmware', 'other']
const SEVERITIES = ['minor', 'moderate', 'major', 'total']

export default function MaintenanceManager({ jobs, damage, devices }: { jobs: Job[]; damage: DamageRpt[]; devices: Device[] }) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'maintenance' | 'damage'>('maintenance')
  const [showNew, setShowNew] = useState(false)
  const [deviceId, setDeviceId] = useState('')
  const [jobType, setJobType] = useState('repair')
  const [jobDesc, setJobDesc] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [showDamage, setShowDamage] = useState(false)
  const [dDeviceId, setDDeviceId] = useState('')
  const [dSeverity, setDSeverity] = useState('minor')
  const [dDesc, setDDesc] = useState('')
  // Per-report damage charge entry + deposit forfeiture (§7–9, §13).
  const [charges, setCharges] = useState<Record<string, string>>({})
  const [chargeNote, setChargeNote] = useState<Record<string, string>>({})
  const [forfeits, setForfeits] = useState<Record<string, boolean>>({})

  const run = async (key: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(key); setError('')
    const res = await fn()
    setBusy('')
    if (!res.ok) setError(res.error ?? 'Operation failed.')
  }

  const schedulable = devices.filter((d) => ['available', 'maintenance', 'inspection'].includes(d.status))
  const reportable = devices.filter((d) => !['damaged', 'lost', 'retired'].includes(d.status))
  const jobTone = (s: string) => s === 'done' ? 'bg-[#e4eee8] text-[#27604a]'
    : s === 'in_progress' ? 'bg-[#f0ecd0] text-[#7a6a2a]' : 'bg-[#f1eee7] text-[#173b3b]/60'

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#173b3b]">
      <div className="px-4 py-8 sm:px-6 xl:px-10">
        <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45"><a href="/admin" className="hover:underline">Admin</a> / Maintenance</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-3xl tracking-tight">Maintenance &amp; damage</h1>
          <span className="rounded-full bg-[#e4eee8] px-2.5 py-1 text-[11px] font-bold text-[#387066]">{jobs.filter((j) => j.status !== 'done').length} open</span>
          <span className="rounded-full bg-[#f5d9d3] px-2.5 py-1 text-[11px] font-bold text-[#a43d2b]">{damage.filter((d) => !d.resolved).length} unresolved</span>
        </div>
        {error && <p className="mt-2 text-sm font-bold text-[#a43d2b]">{error}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          {([['maintenance', 'Maintenance'], ['damage', 'Damage reports']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === k ? 'bg-[#173b3b] text-white' : 'bg-white text-[#173b3b]/70 hover:bg-[#e4eee8]'}`}>{label}</button>
          ))}
        </div>
<div className="mt-5 grid gap-3 rounded-2xl border border-dashed border-[#173b3b]/15 bg-white p-5 sm:grid-cols-2">
          <div>
            <button onClick={() => { setShowNew((v) => !v); setShowDamage(false) }} className="flex items-center gap-2 text-sm font-bold text-[#387066]"><Plus size={15} /> {showNew ? 'Close schedule form' : 'Schedule maintenance'}</button>
            {showNew && (
              <div className="mt-3 grid gap-2">
                <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className="rounded-lg border border-[#173b3b]/15 bg-[#f7f5ef] px-3 py-2 text-sm">
                  <option value="">— Select device —</option>
                  {schedulable.map((d) => <option key={d.id} value={d.id}>{d.assetCode} ({d.status})</option>)}
                </select>
                <select value={jobType} onChange={(e) => setJobType(e.target.value)} className="rounded-lg border border-[#173b3b]/15 bg-[#f7f5ef] px-3 py-2 text-sm">
                  {JOB_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
                <input value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} className="rounded-lg border border-[#173b3b]/15 bg-[#f7f5ef] px-3 py-2 text-sm" placeholder="Description *" />
                <input type="date" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="rounded-lg border border-[#173b3b]/15 bg-[#f7f5ef] px-3 py-2 text-sm" />
                <button onClick={() => run('create', async () => {
                  const r = await createMaintenanceAction({ deviceId, description: jobDesc, type: jobType, scheduledAt: scheduledAt || undefined })
                  if (r.ok) { setDeviceId(''); setJobDesc(''); setScheduledAt(''); setShowNew(false) }
                  return r
                })} disabled={busy !== '' || !deviceId || !jobDesc.trim()}
                  className="rounded-full bg-[#173b3b] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">
                  {busy === 'create' && <Loader2 size={13} className="inline animate-spin" />} Schedule
                </button>
              </div>
            )}
          </div>

          <div>
            <button onClick={() => { setShowDamage((v) => !v); setShowNew(false) }} className="flex items-center gap-2 text-sm font-bold text-[#a43d2b]"><AlertTriangle size={15} /> {showDamage ? 'Close damage form' : 'Report damage'}</button>
            {showDamage && (
              <div className="mt-3 grid gap-2">
                <select value={dDeviceId} onChange={(e) => setDDeviceId(e.target.value)} className="rounded-lg border border-[#173b3b]/15 bg-[#f7f5ef] px-3 py-2 text-sm">
                  <option value="">— Select device —</option>
                  {reportable.map((d) => <option key={d.id} value={d.id}>{d.assetCode} ({d.status})</option>)}
                </select>
                <select value={dSeverity} onChange={(e) => setDSeverity(e.target.value)} className="rounded-lg border border-[#173b3b]/15 bg-[#f7f5ef] px-3 py-2 text-sm">
                  {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input value={dDesc} onChange={(e) => setDDesc(e.target.value)} className="rounded-lg border border-[#173b3b]/15 bg-[#f7f5ef] px-3 py-2 text-sm" placeholder="What's damaged? *" />
                <button onClick={() => run('rd', async () => {
                  const r = await reportDamageAction({ deviceId: dDeviceId, description: dDesc, severity: dSeverity })
                  if (r.ok) { setDDeviceId(''); setDDesc(''); setDSeverity('minor') }
                  return r
                })} disabled={busy !== '' || !dDeviceId || !dDesc.trim()}
                  className="rounded-lg bg-[#a43d2b] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">
                  {busy === 'rd' && <Loader2 size={13} className="inline animate-spin" />} Report damage
                </button>
              </div>
            )}
          </div>
        </div>
{tab === 'maintenance' && (
          <div className="mt-6 rounded-2xl border border-[#173b3b]/10 bg-white">
            {jobs.length === 0 && <p className="px-5 py-10 text-sm text-[#173b3b]/50">No maintenance jobs.</p>}
            {jobs.map((j) => (
              <div key={j.id} className="border-b border-[#173b3b]/8 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Wrench size={16} className="text-[#387066]" />
                    <p className="font-bold">{j.assetCode}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${jobTone(j.status)}`}>{j.status.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-[#173b3b]/50">· {j.type.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#173b3b]/50">device: {j.deviceStatus}</span>
                    {j.status !== 'done' && (
                      <button onClick={() => run(`cmp-${j.id}`, async () => completeMaintenanceAction({ id: j.id, costCents: 0 }))} disabled={busy !== ''}
                        className="flex items-center gap-1 rounded-full bg-[#27604a] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                        {busy === `cmp-${j.id}` ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={13} />} Complete
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm text-[#173b3b]/70">{j.description}</p>
                <p className="mt-1 text-xs text-[#173b3b]/45">{j.scheduledAt ? `Scheduled ${new Date(j.scheduledAt).toLocaleDateString()} · ` : ''}cost {formatMoney(j.costCents)}{j.completedAt ? ` · done ${new Date(j.completedAt).toLocaleDateString()}` : ''}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'damage' && (
          <div className="mt-6 rounded-2xl border border-[#173b3b]/10 bg-white">
            {damage.length === 0 && <p className="px-5 py-10 text-sm text-[#173b3b]/50">No damage reports.</p>}
            {damage.map((d) => (
              <div key={d.id} className="border-b border-[#173b3b]/8 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-[#a43d2b]" />
                    <span className="font-bold">{d.assetCode}</span>
                    <span className="rounded-full bg-[#f5d9d3] px-2.5 py-1 text-[11px] font-bold text-[#a43d2b]">{d.severity}</span>
                    {d.resolved && <span className="rounded-full bg-[#e4eee8] px-2.5 py-1 text-[11px] font-bold text-[#27604a]">resolved</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#173b3b]/50">device: {d.deviceStatus}</span>
                    {!d.resolved && (
                      <button onClick={() => run(`res-${d.id}`, async () => resolveDamageAction({
                        id: d.id,
                        chargeCents: Math.round(Number(charges[d.id] ?? '0') * 100),
                        description: chargeNote[d.id],
                        forfeitDepositCents: forfeits[d.id] && d.bookingId ? Math.round(Number(charges[d.id] ?? '0') * 100) : 0,
                      }))} disabled={busy !== ''}
                        className="flex items-center gap-1 rounded-full bg-[#173b3b] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                        {busy === `res-${d.id}` ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={13} />} Resolve
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm text-[#173b3b]/70">{d.description}</p>
                {!d.resolved && (
                  <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl bg-[#f7f5ef] px-4 py-3">
                    <label className="text-xs font-bold text-[#173b3b]/55">
                      Charge (Rp)
                      <input type="number" min={0} value={charges[d.id] ?? ''} onChange={(e) => setCharges((c) => ({ ...c, [d.id]: e.target.value }))} placeholder="0" className="mt-1 w-32 rounded-lg border border-[#173b3b]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#387066]" />
                    </label>
                    <label className="min-w-48 flex-1 text-xs font-bold text-[#173b3b]/55">
                      Charge note (optional)
                      <input value={chargeNote[d.id] ?? ''} onChange={(e) => setChargeNote((n) => ({ ...n, [d.id]: e.target.value }))} placeholder="e.g. cracked screen" className="mt-1 w-full rounded-lg border border-[#173b3b]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#387066]" />
                    </label>
                    {d.bookingId && (
                      <label className="flex items-center gap-2 pb-2 text-xs font-bold text-[#173b3b]/70">
                        <input type="checkbox" checked={forfeits[d.id] ?? false} onChange={(e) => setForfeits((f) => ({ ...f, [d.id]: e.target.checked }))} />
                        Forfeit from deposit
                      </label>
                    )}
                  </div>
                )}
                <p className="mt-1 text-xs text-[#173b3b]/45">{d.bookingId ? 'Linked to a booking · ' : ''}charge {formatMoney(d.chargeCents)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
