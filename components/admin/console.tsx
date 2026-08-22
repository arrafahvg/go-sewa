'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CalendarDays, Plus, Users, LayoutDashboard } from 'lucide-react'
import { formatMoney } from '@/lib/utils/money'
import type { BookingRow } from '@/lib/data/admin'
import { NewRentalForm, CustomersTable, BookingsTable } from './tables'

type Product = { id: string; slug: string; name: string; depositCents: number; dailyCents: number }
type Customer = { id: string; name: string; phone: string | null }
type Bookings = BookingRow[]
type Tab = 'overview' | 'bookings' | 'new' | 'customers'

export default function AdminConsole({ bookings, customers, products }: { bookings: Bookings; customers: Customer[]; products: Product[] }) {
  const [tab, setTab] = useState<Tab>('overview')
  const statusCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of bookings) map.set(b.status, (map.get(b.status) ?? 0) + 1)
    return map
  }, [bookings])
  const active = bookings.filter((b) => b.status === 'active_rental' || b.status === 'overdue').length

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#173b3b]">
      <header className="border-b border-[#173b3b]/10 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <p className="font-serif text-xl font-bold">go<span className="text-[#e76f51]">—</span>sewa <span className="ml-1 text-sm font-normal text-[#173b3b]/50">/ admin</span></p>
          <nav className="flex items-center gap-3">
            <Link href="/admin/inventory" className="rounded-full border border-[#173b3b]/15 px-4 py-2 text-xs font-bold hover:bg-[#e4eee8]">Inventory</Link>
            <a href="/" className="rounded-full border border-[#173b3b]/15 px-4 py-2 text-xs font-bold hover:bg-[#e4eee8]">View storefront</a>
          </nav>
        </div>
      </header>

      <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-6 pt-6">
        {([['overview', 'Overview', LayoutDashboard], ['bookings', 'Bookings', CalendarDays], ['new', '+ New Rental', Plus], ['customers', 'Customers', Users]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${tab === key ? 'bg-[#173b3b] text-white' : 'bg-white text-[#173b3b]/70 hover:bg-[#e4eee8]'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {tab === 'overview' && <Overview bookings={bookings} statusCounts={statusCounts} active={active} onNew={() => setTab('new')} />}
        {tab === 'bookings' && <BookingsTable bookings={bookings} />}
        {tab === 'new' && <NewRentalForm products={products} customers={customers} />}
        {tab === 'customers' && <CustomersTable customers={customers} />}
      </main>
    </div>
  )
}

function Overview({ bookings, statusCounts, active, onNew }: { bookings: Bookings; statusCounts: Map<string, number>; active: number; onNew: () => void }) {
  const total = bookings.reduce((s, b) => s + b.totalCents, 0)
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl tracking-tight">Operations overview</h1>
        <button onClick={onNew} className="flex items-center gap-2 rounded-full bg-[#e76f51] px-5 py-2.5 text-sm font-bold text-white"><Plus size={16} /> New Rental</button>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Total bookings" value={`${bookings.length}`} />
        <Stat label="Active + overdue" value={`${active}`} />
        <Stat label="Rental value (all)" value={formatMoney(total)} />
      </div>
      <div className="mt-6 rounded-2xl border border-[#173b3b]/10 bg-white p-6">
        <h2 className="font-bold">Status breakdown</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {[...statusCounts.entries()].map(([status, n]) => (
            <span key={status} className="rounded-full bg-[#e4eee8] px-3 py-1 text-xs font-bold text-[#387066]">{status.replace(/_/g, ' ')} · {n}</span>
          ))}
          {statusCounts.size === 0 && <span className="text-sm text-[#173b3b]/50">No bookings yet.</span>}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
      <p className="font-serif text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs font-semibold text-[#173b3b]/55">{label}</p>
    </div>
  )
}