'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Plus, Trash2 } from 'lucide-react'
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

const inputCls = 'mt-1 w-full rounded-lg border border-[#173b3b]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#387066]'

/**
 * Category manager (§5/§42): create/edit/hide/delete categories and choose
 * which ones appear as links in the storefront navbar. All writes go through
 * staff-gated, audit-logged server actions.
 */
export default function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [newNameId, setNewNameId] = useState('')
  const [newNameEn, setNewNameEn] = useState('')
  const [newShowInNav, setNewShowInNav] = useState(true)

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

  async function create(e: React.FormEvent) {
    e.preventDefault()
    const ok = await run(
      () => createCategoryAction({ nameId: newNameId, nameEn: newNameEn, showInNav: newShowInNav }),
      'Category created.',
    )
    if (ok) { setNewNameId(''); setNewNameEn(''); setNewShowInNav(true) }
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
          <label className="flex items-end gap-2 pb-2 text-xs font-bold text-[#173b3b]/60">
            <input type="checkbox" checked={newShowInNav} onChange={(e) => setNewShowInNav(e.target.checked)} className="h-4 w-4 accent-[#e76f51]" />
            Show in navbar
          </label>
          <div className="flex items-end">
            <button disabled={busyId === 'form'} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#173b3b] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
              {busyId === 'form' && <Loader2 size={15} className="animate-spin" />} Create category
            </button>
          </div>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-[#173b3b]/10 bg-white">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="bg-[#f1eee7] text-xs text-[#173b3b]/50">
            <tr>{['Name (ID)', 'Name (EN)', 'Slug', 'Sort', 'Navbar', 'Active', ''].map((h) => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {categories.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-[#173b3b]/50">No categories yet — create the first one above.</td></tr>}
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
                  <button
                    onClick={() => update(c.id, { showInNav: !c.showInNav }, c.showInNav ? 'Removed from navbar.' : 'Added to navbar.')}
                    disabled={busyId === c.id}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${c.showInNav ? 'bg-[#e4eee8] text-[#27604a]' : 'bg-[#f0ecd0] text-[#7a6a2a]'}`}
                  >
                    {busyId === c.id ? <Loader2 size={11} className="inline animate-spin" /> : c.showInNav ? 'In navbar' : 'Hidden'}
                  </button>
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => update(c.id, { active: !c.active }, c.active ? 'Category hidden from storefront.' : 'Category activated.')}
                    disabled={busyId === c.id}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${c.active ? 'bg-[#e4eee8] text-[#27604a]' : 'bg-[#f0ecd0] text-[#7a6a2a]'}`}
                  >
                    {c.active ? 'Active' : 'Inactive'}
                  </button>
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
