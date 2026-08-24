'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import ManualInvoiceForm from './manual-invoice-form'
import type { PaymentDetails } from '@/lib/services/settings'

type ExistingCustomer = { id: string; name: string; phone: string | null; email?: string | null }

/** "New manual invoice" toggle on the /admin/invoices list (§35). */
export default function ManualInvoicePanel({ customers, paymentOptions }: { customers: ExistingCustomer[]; paymentOptions: PaymentDetails }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-full bg-[#e76f51] px-5 py-2.5 text-sm font-bold text-white">
        {open ? <X size={15} /> : <Plus size={15} />} {open ? 'Close' : 'New manual invoice'}
      </button>
      {open && (
        <div className="mt-5">
          <ManualInvoiceForm customers={customers} paymentOptions={paymentOptions} />
        </div>
      )}
    </div>
  )
}