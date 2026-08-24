'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import ManualAgreementForm from './manual-agreement-form'

type ExistingCustomer = { id: string; name: string; phone: string | null; email?: string | null }

/** "New manual agreement" toggle on the /admin/agreements list (§21/§35). */
export default function ManualAgreementPanel({ customers }: { customers: ExistingCustomer[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-full bg-[#e76f51] px-5 py-2.5 text-sm font-bold text-white">
        {open ? <X size={15} /> : <Plus size={15} />} {open ? 'Close' : 'New manual agreement'}
      </button>
      {open && (
        <div className="mt-5">
          <ManualAgreementForm customers={customers} />
        </div>
      )}
    </div>
  )
}