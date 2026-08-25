'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, Loader2, Plus, Trash2 } from 'lucide-react'
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from '@/app/actions/categories'

type CategoryRow = {
  id: string
  slug: string
  nameId: string
  nameEn: string
  showInNav: boolean
  sortOrder: number
  active: boolean
}

type ProductOption = { id: string; name: string }

const inputCls = 'mt-1 w-full rounded-lg border border-[#173b3b]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#387066]'
const selectCls = 'rounded-lg border border-[#173b3b]/15 bg-white px-2.5 py-1.5 text-xs font-bold text-[#173b3b] outline-none focus:border-[#387066] disabled:opacity-50'

/**
 * Category manager (§5/§42): create/edit/hide/delete categories, choose which
 * ones appear as links in the storefront navbar, and assign existing products
 * to a category right when it is created. All writes go through staff-gated,
 * audit-logged server actions.
 */
export default function CategoryManager({ categories, products }: { categories: CategoryRow[]; products: ProductOption[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [newNameId, setNewNameId] = useState('')
  const [newNameEn, setNewNameEn] = useState('')
  const [newShowInNav, setNewShowInNav] = useState(true)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [showProductPicker, setShowProductPicker] = useState(false)

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMessage: string, busyKey?: string) {
    setBusyId(busyKey ?? 'form'); setError(''); setSuccess('')
    const res = await fn()
    setBusyId(null)
    if (!res.ok) { setError(res.error ?? 'Something went wrong.'); return false }
    setSuccess(okMessage)
    router.refresh()
    return true
  }

  function update(id: string, patch: Partial<CategoryRow>, okMessage: string) {
    void run(() => updateCategoryAction({ id, ...patch }), okMessage, id)
  }

  function toggleProduct(id: string) {
    setSelectedProductIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    const count = selectedProductIds.length
    const ok = await run(
      () => createCategoryAction({ nameId: newNameId, nameEn: newNameEn, showInNav: newShowInNav, productIds: selectedProductIds }),
      count > 0 ? `Category created — ${count} product${count === 1 ? '' : 's'} assigned.` : 'Category created.',
    )
    if (ok) { setNewNameId(''); setNewNameEn(''); setNewShowInNav(true); setSelectedProductIds([]); setShowProductPicker(false) }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
        <h2 className="flex items-center gap-2 font-bold"><Plus size={17} /> New category</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <label className="block text-xs font-bold text-[#173b3b]/60">Name (Indonesian)
            <input value={newNameId} onChange={(e) => setNewNameId(e.target.value)} required className={inputCls} placeholder="e.g. Drone" />
          </label>
          <label className="block text-xs font-bold text-[#173b3b]/60">Name (English)
            <input value={newNameEn} onChange={(e) => setNewNameEn(e.target.value)} required className={inputCls} placeholder="e.g. Drones" />
          </label>
          <label className="block text-xs font-bold text-[#173b3b]/60">Navbar link
            <select value={newShowInNav ? 'shown' : 'hidden'} onChange={(e) => setNewShowInNav(e.target.value === 'shown')} className={inputCls}>
              <option value="shown">Show in navbar</option>
              <option value="hidden">Hidden from navbar</option>
            </select>
          </label>
          <div className="flex items-end">
            <button disabled={busyId === 'form'} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#173b3b] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
              {busyId === 'form' && <Loader2 size={15} className="animate-spin" />} Create category
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[#173b3b]/10 bg-[#faf8f2] p-4">
          <button type="button" onClick={() => setShowProductPicker((v) => !v)} className="flex w-full items-center justify-between text-left text-xs font-bold text-[#173b3b]/70">
            <span>
              Assign existing products to this category (optional)
              {selectedProductIds.length > 0 && (
                <span className="ml-2 rounded-full bg-[#e76f51] px-2 py-0.5 text-[10px] font-bold text-white">{selectedProductIds.length} selected</span>
              )}
            </span>
            <ChevronDown size={14} className={`transition ${showProductPicker ? 'rotate-180' : ''}`} />
          </button>
          {showProductPicker && (
            products.length === 0
              ? <p className="mt-3 text-xs text-[#173b3b]/50">No products exist yet — you can assign products to this category later from Inventory.</p>
              : (
                <div className="mt-3 grid max-h-48 gap-1.5 overflow-y-auto sm:grid-cols-2">
                  {products.map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#173b3b]/80">
                      <input type="checkbox" checked={selectedProductIds.includes(p.id)} onChange={() => toggleProduct(p.id)} className="h-3.5 w-3.5 accent-[#e76f51]" />
                      {p.name}
                    </label>
                  ))}
                </div>
              )
          )}
          <p className="mt-2 text-[11px] text-[#173b3b]/45">Picked products move into this category as soon as it is created.</p>
        </div>
      </form>

      <p className="text-xs text-[#173b3b]/55">
        <strong>Navbar</strong> controls whether the category appears as a link in the storefront navbar.{' '}
        <strong>Storefront</strong>: Active means customers can browse the category on /rent; Inactive hides it from the storefront (products keep their assignment).
      </p>

      <div className="overflow-x-auto rounded-2xl border border-[#173b3b]/10 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-[#f1eee7] text-xs text-[#173b3b]/50">
            <tr>
              <th className="px-5 py-3 font-semibold">Name (ID)</th>
              <th className="px-5 py-3 font-semibold">Name (EN)</th>
              <th className="px-5 py-3 font-semibold">Slug</th>
              <th className="px-5 py-3 font-semibold">Sort</th>
              <th className="px-5 py-3 font-semibold">Navbar</th>
              <th className="px-5 py-3 font-semibold">Storefront</th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-[#173b3b]/50">No categories yet.</td></tr>}
            {categories.map((c) => (
              <tr key={c.id} className="border-t border-[#173b3b]/8">
                <td className="px-5 py-3">
                  <input
                    defaultValue={c.nameId}
                    onBlur={(e) => { if (e.target.value.trim() && e.target.value !== c.nameId) update(c.id, { nameId: e.target.value }, 'Category updated.') }}
                    className="w-full rounded-lg border border-transparent px-2 py-1.5 hover:border-[#173b3b]/15 focus:border-[#387066] focus:outline-none"
                  />
                </td>
                <td className="px-5 py-3">
                  <input
                    defaultValue={c.nameEn}
                    onBlur={(e) => { if (e.target.value.trim() && e.target.value !== c.nameEn) update(c.id, { nameEn: e.target.value }, 'Category updated.') }}
                    className="w-full rounded-lg border border-transparent px-2 py-1.5 hover:border-[#173b3b]/15 focus:border-[#387066] focus:outline-none"
                  />
                </td>
                <td className="px-5 py-3 font-mono text-xs text-[#173b3b]/55">{c.slug}</td>
                <td className="px-5 py-3">
                  <input
                    type="number" min={0} defaultValue={c.sortOrder}
                    onBlur={(e) => { const v = Math.max(0, Math.floor(Number(e.target.value) || 0)); if (v !== c.sortOrder) update(c.id, { sortOrder: v }, 'Category updated.') }}
                    className="w-16 rounded-lg border border-transparent px-2 py-1.5 hover:border-[#173b3b]/15 focus:border-[#387066] focus:outline-none"
                  />
                </td>
                <td className="px-5 py-3">
                  <select
                    value={c.showInNav ? 'shown' : 'hidden'}
                    onChange={(e) => update(c.id, { showInNav: e.target.value === 'shown' }, e.target.value === 'shown' ? 'Added to navbar.' : 'Removed from navbar.')}
                    disabled={busyId === c.id}
                    className={selectCls}
                    aria-label={`Navbar visibility for ${c.nameEn}`}
                  >
                    <option value="shown">Show in navbar</option>
                    <option value="hidden">Hidden from navbar</option>
                  </select>
                </td>
                <td className="px-5 py-3">
                  <select
                    value={c.active ? 'active' : 'inactive'}
                    onChange={(e) => update(c.id, { active: e.target.value === 'active' }, e.target.value === 'active' ? 'Category visible on the storefront.' : 'Category hidden from the storefront.')}
                    disabled={busyId === c.id}
                    className={selectCls}
                    aria-label={`Storefront visibility for ${c.nameEn}`}
                  >
                    <option value="active">Active — visible on /rent</option>
                    <option value="inactive">Inactive — hidden from storefront</option>
                  </select>
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => { if (window.confirm(`Delete category "${c.nameEn}"?`)) void run(() => deleteCategoryAction(c.id), 'Category deleted.', c.id) }}
                    disabled={busyId === c.id}
                    className="text-xs font-bold text-[#a43d2b] hover:underline disabled:opacity-50"
                  >
                    <Trash2 size={13} className="inline" /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(error || success) && (
        <p className={`flex items-center gap-1 text-sm font-bold ${error ? 'text-[#a43d2b]' : 'text-[#27604a]'}`}>
          {!error && <Check size={14} />} {error || success}
        </p>
      )}
    </div>
  )
}