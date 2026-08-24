'use client'

import { useState } from 'react'
import { Search, UserPlus, Users } from 'lucide-react'

export type PickedCustomer = {
  customerId: string | null
  name: string
  phone: string
  email: string
}

export type PickerCustomer = {
  id: string
  name: string
  phone: string | null
  email?: string | null
}

const EMPTY: PickedCustomer = { customerId: null, name: '', phone: '', email: '' }

/**
 * Reusable admin customer selector (§19B / §35).
 *
 * The previous plain `<datalist>` could only suggest a name — it could never
 * auto-fill the phone/email, and its rendering was inconsistent across browsers.
 * This component replaces it with two clearly separated modes:
 *
 *  - **Existing customer** — searchable comobox; picking one AUTOFILLS the name,
 *    phone and email and returns the customer id so the booking / invoice /
 *    agreement reuses that exact record.
 *  - **New customer** — blank name / phone / email fields (customer id is null
 *    so the service creates a fresh record).
 *
 * The parent form owns the resulting `PickedCustomer`; this component only edits
 * its own search/mode state and reports changes through `onSelect`.
 */
export default function CustomerPicker({
  customers,
  value,
  onSelect,
  inputCls,
}: {
  customers: PickerCustomer[]
  value: PickedCustomer
  onSelect: (picked: PickedCustomer) => void
  inputCls?: string
}) {
  const [mode, setMode] = useState<'existing' | 'new'>(value.customerId ? 'existing' : 'new')
  const [query, setQuery] = useState(value.name)
  const [open, setOpen] = useState(false)

  const fieldCls = inputCls ?? 'mt-2 w-full rounded-xl border border-[#173b3b]/12 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#e76f51]'

  const switchMode = (m: 'existing' | 'new') => {
    setMode(m)
    setOpen(false)
    setQuery('')
    if (m === 'new' && value.customerId) {
      // Leaving a selected existing customer → clear the identity so the server creates a new one.
      onSelect(EMPTY)
    }
  }

  const matches = query.trim()
    ? customers
        .filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 12)
    : customers.slice(0, 8)

  const pick = (c: PickerCustomer) => {
    setQuery(c.name)
    setOpen(false)
    onSelect({ customerId: c.id, name: c.name, phone: c.phone ?? '', email: c.email ?? '' })
  }

  const segBtn = (active: boolean) =>
    `rounded-full px-4 py-2 text-xs font-bold ${active ? 'bg-[#173b3b] text-white' : 'bg-[#f1eee7] text-[#173b3b]/70'}`

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button type="button" onClick={() => switchMode('existing')} className={segBtn(mode === 'existing')}>
          <Users size={13} className="mr-1 inline" />Existing customer
        </button>
        <button type="button" onClick={() => switchMode('new')} className={segBtn(mode === 'new')}>
          <UserPlus size={13} className="mr-1 inline" />New customer
        </button>
      </div>

      {mode === 'existing' ? (
        <div>
          <label className="block text-xs font-bold text-[#173b3b]/60">Search existing customer
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#173b3b]/40" />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 200)}
                className={`${fieldCls} pl-9`}
                placeholder="Type a name to search…"
              />
            </div>
          </label>

          {open && (
            <ul className="mt-1 max-h-56 overflow-auto rounded-xl border border-[#173b3b]/12 bg-white shadow-sm">
              {matches.length === 0 && (
                <li className="px-4 py-3 text-sm text-[#173b3b]/50">No matching customers.</li>
              )}
              {matches.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseDown={() => pick(c)}
                    className="flex w-full flex-col items-start gap-0.5 border-b border-[#173b3b]/8 px-4 py-2.5 text-left hover:bg-[#e4eee8]"
                  >
                    <span className="text-sm font-bold text-[#173b3b]">{c.name}</span>
                    <span className="text-xs text-[#173b3b]/50">
                      {c.phone ? c.phone : 'No phone'}
                      {c.email ? ` · ${c.email}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold text-[#173b3b]/60">Full name
            <input
              value={value.name}
              onChange={(e) => onSelect({ ...EMPTY, ...value, name: e.target.value })}
              className={fieldCls}
              placeholder="New customer name"
              required
            />
          </label>
          <label className="block text-xs font-bold text-[#173b3b]/60">WhatsApp / phone
            <input value={value.phone} onChange={(e) => onSelect({ ...EMPTY, ...value, phone: e.target.value })} className={fieldCls} placeholder="+62 812 ..." />
          </label>
          <label className="block text-xs font-bold text-[#173b3b]/60 sm:col-span-2">Email (optional)
            <input value={value.email} onChange={(e) => onSelect({ ...EMPTY, ...value, email: e.target.value })} className={fieldCls} placeholder="name@example.com" />
          </label>
        </div>
      )}
    </div>
  )
}