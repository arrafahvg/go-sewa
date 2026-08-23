'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { CmsFaq } from '@/lib/types/cms'

export default function FaqAccordion({ items }: { items: CmsFaq[] }) {
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null)
  if (items.length === 0) return null
  return (
    <div className="mx-auto max-w-3xl divide-y divide-[#173b3b]/10 border-y border-[#173b3b]/10">
      {items.map((f) => {
        const isOpen = open === f.id
        return (
          <div key={f.id}>
            <button
              onClick={() => setOpen(isOpen ? null : f.id)}
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
              aria-expanded={isOpen}
            >
              <span className="font-semibold text-[#173b3b]">{f.question}</span>
              <ChevronDown size={18} className={`shrink-0 text-[#173b3b]/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <p className="pb-5 text-sm leading-6 text-[#173b3b]/65">{f.answer}</p>}
          </div>
        )
      })}
    </div>
  )
}