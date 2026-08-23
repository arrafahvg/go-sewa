'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Package, Smartphone } from 'lucide-react'
import { formatMoney } from '@/lib/utils/money'
import type { AdminDevice } from '@/lib/data/admin'
import {
  saveProductAction, savePricingRuleAction, deletePricingRuleAction, saveDeviceAction,
} from '@/app/actions/inventory'

type PricingRuleKind = 'daily' | 'weekly' | 'monthly' | 'weekend' | 'seasonal' | 'promo' | 'custom'
export type AdminProductView = {
  id: string
  name: string
  slug: string
  description: string | null
  depositCents: number
  depositRequired: boolean
  active: boolean
  imageUrl: string | null
}
export type AdminPricingRule = {
  id: string
  productId: string
  kind: string
  label: string
  centsPerDay: number
  packageCents: number
  active: boolean
  priority: number
}

const inputCls = 'mt-1 w-full rounded-lg border border-[#173b3b]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#387066]'
const RULE_KINDS: PricingRuleKind[] = ['daily', 'weekly', 'monthly', 'weekend', 'seasonal', 'promo', 'custom']

function Notice({ error, success }: { error?: string | null; success?: string | null }) {
  if (!error && !success) return null
  return <p className={`text-sm font-bold ${error ? 'text-[#a43d2b]' : 'text-[#27604a]'}`}>{error ?? success}</p>
}

export default function InventoryManager({
  products, rules, devices,
}: {
  products: AdminProductView[]
  rules: AdminPricingRule[]
  devices: AdminDevice[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'products' | 'devices'>('products')
  const refresh = () => router.refresh()
  const deviceCountByProduct = new Map<string, number>()
  for (const d of devices) deviceCountByProduct.set(d.productId, (deviceCountByProduct.get(d.productId) ?? 0) + 1)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-3xl tracking-tight">Inventory</h1>
        <nav className="flex gap-2">
          {([['products', 'Products', Package], ['devices', `Devices (${devices.length})`, Smartphone]] as const).map(([key, label, Icon]) => (
            <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${tab === key ? 'bg-[#173b3b] text-white' : 'bg-white text-[#173b3b]/70 hover:bg-[#e4eee8]'}`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'products'
        ? <ProductsPanel products={products} rules={rules} deviceCountByProduct={deviceCountByProduct} onChanged={refresh} />
        : <DevicesPanel products={products} devices={devices} onChanged={refresh} />}
    </div>
  )
}

// --- Products -----------------------------------------------------------------

function ProductsPanel({ products, rules, deviceCountByProduct, onChanged }: {
  products: AdminProductView[]
  rules: AdminPricingRule[]
  deviceCountByProduct: Map<string, number>
  onChanged: () => void
}) {
  const [editing, setEditing] = useState<AdminProductView | 'new' | null>(null)
  const [rulesFor, setRulesFor] = useState<string | null>(null)

  return (
    <div className="mt-6">
      <button onClick={() => setEditing(editing === 'new' ? null : 'new')} className="flex items-center gap-2 rounded-full bg-[#e76f51] px-5 py-2.5 text-sm font-bold text-white">
        <Plus size={15} /> New product
      </button>

      {editing === 'new' && <ProductForm product={null} onDone={(ok) => { if (ok) { setEditing(null); onChanged() } }} />}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-[#173b3b]/10 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[#f1eee7] text-xs text-[#173b3b]/50">
            <tr>{['Product', 'Slug', 'Deposit', 'Devices', 'Rules', 'Status', ''].map((h, i) => <th key={i} className="px-5 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {products.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-[#173b3b]/50">No products yet.</td></tr>}
            {products.map((p) => (
              <tr key={p.id} className="border-t border-[#173b3b]/8 transition hover:bg-[#faf8f2]">
                <td className="px-5 py-4 font-bold">{p.name}</td>
                <td className="px-5 py-4 font-mono text-xs">{p.slug}</td>
                <td className="px-5 py-4">{formatMoney(p.depositCents)}</td>
                <td className="px-5 py-4">{deviceCountByProduct.get(p.id) ?? 0}</td>
                <td className="px-5 py-4">{rules.filter((r) => r.productId === p.id).length}</td>
                <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${p.active ? 'bg-[#e4eee8] text-[#27604a]' : 'bg-[#f0ecd0] text-[#7a6a2a]'}`}>{p.active ? 'active' : 'inactive'}</span></td>
                <td className="whitespace-nowrap px-5 py-4 text-right">
                  <button onClick={() => setEditing(typeof editing === 'object' && editing !== null && editing.id === p.id ? null : p)} className="rounded-full border border-[#173b3b]/15 px-3 py-1.5 text-xs font-bold hover:bg-[#e4eee8]">Edit</button>
                  <button onClick={() => setRulesFor(rulesFor === p.id ? null : p.id)} className="ml-2 rounded-full border border-[#173b3b]/15 px-3 py-1.5 text-xs font-bold hover:bg-[#e4eee8]">Pricing</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && editing !== 'new' && (
        <ProductForm product={editing} onDone={(ok) => { if (ok) { setEditing(null); onChanged() } }} />
      )}

      {rulesFor && (
        <PricingRulesPanel productId={rulesFor} productName={products.find((p) => p.id === rulesFor)?.name ?? ''} rules={rules.filter((r) => r.productId === rulesFor)} onChanged={onChanged} />
      )}
    </div>
  )
}


function ProductForm({ product, onDone }: { product: AdminProductView | null; onDone: (ok: boolean) => void }) {
  const [name, setName] = useState(product?.name ?? '')
  const [slug, setSlug] = useState(product?.slug ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [deposit, setDeposit] = useState(String(product?.depositCents ?? 0))
  const [depositRequired, setDepositRequired] = useState(product?.depositRequired ?? false)
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? '')
  const [active, setActive] = useState(product?.active ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true); setError(null)
    const res = await saveProductAction({
      id: product?.id,
      name,
      slug,
      description,
      depositCents: Math.round(Number(deposit) || 0),
      depositRequired,
      imageUrl: imageUrl || null,
      active,
    })
    setBusy(false)
    if (!res.ok) setError(res.error)
    else onDone(true)
  }

  return (
    <div className="mt-6 rounded-2xl border border-[#173b3b]/10 bg-white p-6">
      <h2 className="font-serif text-xl font-bold">{product ? `Edit ${product.name}` : 'New product'}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-bold text-[#173b3b]/60">Name<input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></label>
        <label className="block text-xs font-bold text-[#173b3b]/60">Slug {product && <span className="font-normal">(locked after creation)</span>}<input value={slug} onChange={(e) => setSlug(e.target.value)} disabled={!!product} className={`${inputCls} ${product ? 'opacity-50' : ''}`} placeholder="auto-generated from name" /></label>
        <label className="block text-xs font-bold text-[#173b3b]/60">Deposit (Rp)<input type="number" min={0} value={deposit} onChange={(e) => setDeposit(e.target.value)} className={inputCls} /></label>
        <label className="block text-xs font-bold text-[#173b3b]/60">Image URL<input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={inputCls} placeholder="/images/..." /></label>
        <label className="block text-xs font-bold text-[#173b3b]/60 sm:col-span-2">Description<textarea value={description ?? ''} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} /></label>
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs font-bold text-[#173b3b]/60">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Visible on storefront
      </label>
      <label className="mt-3 flex items-center gap-2 text-sm font-bold text-[#173b3b]/70">
        <input type="checkbox" checked={depositRequired} onChange={(e) => setDepositRequired(e.target.checked)} /> Require security deposit at checkout (ID document required)
      </label>
      <div className="mt-4"><Notice error={error} /></div>
      <button onClick={submit} disabled={busy} className="mt-2 flex items-center gap-2 rounded-full bg-[#173b3b] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
        {busy && <Loader2 size={15} className="animate-spin" />} Save product
      </button>
    </div>
  )
}

function PricingRulesPanel({ productId, productName, rules, onChanged }: {
  productId: string; productName: string; rules: AdminPricingRule[]; onChanged: () => void
}) {
  const [label, setLabel] = useState('')
  const [kind, setKind] = useState<PricingRuleKind>('daily')
  const [centsPerDay, setCentsPerDay] = useState('0')
  const [packageCents, setPackageCents] = useState('0')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function add() {
    setBusy(true); setError(null); setSuccess(null)
    const res = await savePricingRuleAction({
      productId, kind, label,
      centsPerDay: Math.round(Number(centsPerDay) || 0),
      packageCents: Math.round(Number(packageCents) || 0),
    })
    setBusy(false)
    if (!res.ok) setError(res.error)
    else { setSuccess('Rule added.'); setLabel(''); onChanged() }
  }

  async function remove(id: string) {
    setError(null); setSuccess(null)
    const res = await deletePricingRuleAction(id)
    if (!res.ok) setError(res.error)
    else { setSuccess('Rule deleted.'); onChanged() }
  }

  return (
    <div className="mt-6 rounded-2xl border border-[#173b3b]/10 bg-white p-6">
      <h2 className="font-serif text-xl font-bold">Pricing rules — {productName}</h2>
      <p className="mt-1 text-xs text-[#173b3b]/50">Historical bookings keep their price snapshots (§58), so rule changes never mutate old bookings.</p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-[#173b3b]/10">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-[#f1eee7] text-xs text-[#173b3b]/50">
            <tr>{['Label', 'Kind', 'Per day', 'Package', 'Priority', 'Active', ''].map((h, i) => <th key={i} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rules.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-xs text-[#173b3b]/50">No pricing rules yet.</td></tr>}
            {rules.map((r) => (
              <tr key={r.id} className="border-t border-[#173b3b]/8">
                <td className="px-4 py-3 font-bold">{r.label}</td>
                <td className="px-4 py-3 text-xs">{r.kind}</td>
                <td className="px-4 py-3">{formatMoney(r.centsPerDay)}</td>
                <td className="px-4 py-3">{r.packageCents ? formatMoney(r.packageCents) : '—'}</td>
                <td className="px-4 py-3 text-xs">{r.priority}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${r.active ? 'bg-[#e4eee8] text-[#27604a]' : 'bg-[#f0ecd0] text-[#7a6a2a]'}`}>{r.active ? 'active' : 'inactive'}</span></td>
                <td className="px-4 py-3 text-right"><button onClick={() => remove(r.id)} className="text-xs font-bold text-[#a43d2b] hover:underline">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid items-end gap-3 sm:grid-cols-5">
        <label className="block text-xs font-bold text-[#173b3b]/60 sm:col-span-2">Label<input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} placeholder="e.g. Weekly package" /></label>
        <label className="block text-xs font-bold text-[#173b3b]/60">Kind<select value={kind} onChange={(e) => setKind(e.target.value as PricingRuleKind)} className={inputCls}>{RULE_KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
        <label className="block text-xs font-bold text-[#173b3b]/60">Per day (Rp)<input type="number" min={0} value={centsPerDay} onChange={(e) => setCentsPerDay(e.target.value)} className={inputCls} /></label>
        <label className="block text-xs font-bold text-[#173b3b]/60">Package (Rp)<input type="number" min={0} value={packageCents} onChange={(e) => setPackageCents(e.target.value)} className={inputCls} /></label>
      </div>
      <div className="mt-3 space-y-2">
        <Notice error={error} success={success} />
        <button onClick={add} disabled={busy} className="flex items-center gap-2 rounded-full bg-[#173b3b] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
          {busy && <Loader2 size={15} className="animate-spin" />} Add rule
        </button>
      </div>
    </div>
  )
}

// --- Devices --------------------------------------------------------------------

const DEVICE_STATUSES = ['available', 'maintenance', 'damaged', 'lost', 'retired', 'blocked'] as const
type SettableStatus = (typeof DEVICE_STATUSES)[number]

function DevicesPanel({ products, devices, onChanged }: {
  products: AdminProductView[]
  devices: AdminDevice[]
  onChanged: () => void
}) {
  return (
    <div className="mt-6">
      <DeviceForm products={products} onDone={onChanged} />
      <div className="mt-6 overflow-x-auto rounded-2xl border border-[#173b3b]/10 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-[#f1eee7] text-xs text-[#173b3b]/50">
            <tr>{['Asset code', 'Product', 'Status', 'Condition', 'IMEI / Serial', 'Storage', 'Battery', 'Set status'].map((h, i) => <th key={i} className="px-5 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {devices.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-[#173b3b]/50">No physical devices yet — add units so the product becomes bookable.</td></tr>}
            {devices.map((d) => (
              <tr key={d.id} className="border-t border-[#173b3b]/8 transition hover:bg-[#faf8f2]">
                <td className="px-5 py-4 font-mono text-xs font-bold">{d.assetCode}</td>
                <td className="px-5 py-4">{products.find((p) => p.id === d.productId)?.name ?? d.productId}</td>
                <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${d.status === 'available' ? 'bg-[#e4eee8] text-[#27604a]' : ['rented', 'reserved', 'overdue'].includes(d.status) ? 'bg-[#f0ecd0] text-[#7a6a2a]' : d.status === 'maintenance' || d.status === 'damaged' ? 'bg-[#f5d9d3] text-[#a43d2b]' : 'bg-[#e0e3e0] text-[#4d6b62]'}`}>{d.status}</span></td>
                <td className="px-5 py-4 text-xs">{d.condition}</td>
                <td className="px-5 py-4 font-mono text-xs">{d.imei ?? '—'}{d.serialNumber ? ` · ${d.serialNumber}` : ''}</td>
                <td className="px-5 py-4 text-xs">{d.storage ?? '—'}</td>
                <td className="px-5 py-4 text-xs">{d.batteryHealth != null ? `${d.batteryHealth}%` : '—'}</td>
                <td className="px-5 py-4"><StatusChanger device={d} onDone={onChanged} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusChanger({ device, onDone }: { device: AdminDevice; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const committed = ['rented', 'reserved', 'overdue'].includes(device.status)

  async function change(status: string) {
    setBusy(true); setError(null)
    const res = await saveDeviceAction({
      id: device.id,
      productId: device.productId,
      assetCode: device.assetCode,
      status: status as SettableStatus,
    })
    setBusy(false)
    if (!res.ok) setError(res.error)
    else onDone()
  }

  if (committed) return <span className="text-xs text-[#173b3b]/45">Check in via booking</span>
  return (
    <span className="flex items-center gap-2">
      <select
        defaultValue=""
        disabled={busy}
        onChange={(e) => e.target.value && change(e.target.value)}
        className="rounded-lg border border-[#173b3b]/15 bg-white px-2 py-1.5 text-xs"
      >
        <option value="">Change…</option>
        {DEVICE_STATUSES.filter((s) => s !== device.status).map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {busy && <Loader2 size={13} className="animate-spin" />}
      {error && <span className="text-xs font-bold text-[#a43d2b]">{error}</span>}
    </span>
  )
}

function DeviceForm({ products, onDone }: { products: AdminProductView[]; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [productId, setProductId] = useState('')
  const [assetCode, setAssetCode] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [imei, setImei] = useState('')
  const [color, setColor] = useState('')
  const [storage, setStorage] = useState('')
  const [batteryHealth, setBatteryHealth] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true); setError(null)
    if (!productId || !assetCode.trim()) { setBusy(false); setError('Select a product and enter an asset code.'); return }
    const res = await saveDeviceAction({
      productId,
      assetCode,
      serialNumber: serialNumber || undefined,
      imei: imei || undefined,
      color: color || undefined,
      storage: storage || undefined,
      batteryHealth: batteryHealth ? Number(batteryHealth) : null,
      notes: notes || undefined,
    })
    setBusy(false)
    if (!res.ok) { setError(res.error); return }
    setAssetCode(''); setSerialNumber(''); setImei(''); setColor(''); setStorage(''); setBatteryHealth(''); setNotes('')
    setOpen(false)
    onDone()
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-full bg-[#e76f51] px-5 py-2.5 text-sm font-bold text-white">
        <Plus size={15} /> Register device
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
      <h2 className="font-serif text-xl font-bold">Register physical unit</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="block text-xs font-bold text-[#173b3b]/60">Product
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className={inputCls}>
            <option value="">— Select product —</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="block text-xs font-bold text-[#173b3b]/60">Asset code *<input value={assetCode} onChange={(e) => setAssetCode(e.target.value)} className={inputCls} placeholder="GS-IP13-001" /></label>
        <label className="block text-xs font-bold text-[#173b3b]/60">Serial number<input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className={inputCls} /></label>
        <label className="block text-xs font-bold text-[#173b3b]/60">IMEI<input value={imei} onChange={(e) => setImei(e.target.value)} className={inputCls} /></label>
        <label className="block text-xs font-bold text-[#173b3b]/60">Color<input value={color} onChange={(e) => setColor(e.target.value)} className={inputCls} /></label>
        <label className="block text-xs font-bold text-[#173b3b]/60">Storage<input value={storage} onChange={(e) => setStorage(e.target.value)} className={inputCls} placeholder="128GB" /></label>
        <label className="block text-xs font-bold text-[#173b3b]/60">Battery health (%)<input type="number" min={0} max={100} value={batteryHealth} onChange={(e) => setBatteryHealth(e.target.value)} className={inputCls} /></label>
        <label className="block text-xs font-bold text-[#173b3b]/60 sm:col-span-2">Notes<input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></label>
      </div>
      <div className="mt-4"><Notice error={error} /></div>
      <div className="mt-2 flex gap-3">
        <button onClick={submit} disabled={busy} className="flex items-center gap-2 rounded-full bg-[#173b3b] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
          {busy && <Loader2 size={15} className="animate-spin" />} Register unit
        </button>
        <button onClick={() => setOpen(false)} className="rounded-full border border-[#173b3b]/15 px-6 py-3 text-sm font-bold hover:bg-[#f1eee7]">Cancel</button>
      </div>
    </div>
  )
}
