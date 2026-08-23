'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, Users, UserPlus, Wrench, ReceiptText,
  FileText, Settings, ExternalLink, ChevronDown, ChevronRight,
} from 'lucide-react'

type Item = { label: string; href: string; icon: React.ComponentType<{ size?: number }> }
type Group = { label: string; items: Item[] }

/** Multi-level admin navigation (§43): top-level entries + collapsible groups. */
const TOP_ITEMS: Item[] = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
]

const GROUPS: Group[] = [
  {
    label: 'Catalog',
    items: [{ label: 'Inventory', href: '/admin/inventory', icon: Package }],
  },
  {
    label: 'Customers',
    items: [
      { label: 'Customers', href: '/admin/customers', icon: Users },
      { label: 'Leads', href: '/admin/leads', icon: UserPlus },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Maintenance & damage', href: '/admin/maintenance', icon: Wrench },
      { label: 'Invoices', href: '/admin/invoices', icon: ReceiptText },
    ],
  },
  {
    label: 'Site',
    items: [
      { label: 'Content CMS', href: '/admin/content', icon: FileText },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
]

export default function AdminSidebar({ user }: { user: { name: string; role: string } | null }) {
  const pathname = usePathname()
  // Groups start expanded; a group is auto-open when it contains the active page.
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GROUPS.map((g) => [g.label, true])))

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-[#173b3b]/10 bg-white">
      <div className="border-b border-[#173b3b]/10 px-5 py-4">
        <Link href="/admin" className="font-serif text-xl font-bold">
          go<span className="text-[#e76f51]">—</span>sewa
          <span className="ml-1 text-sm font-normal text-[#173b3b]/50">/ admin</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {TOP_ITEMS.map((item) => (
          <SidebarLink key={item.href} item={item} active={isActive(item.href)} />
        ))}

        {GROUPS.map((group) => {
          const isOpen = open[group.label]
          const groupActive = group.items.some((i) => isActive(i.href))
          return (
            <div key={group.label}>
              <button
                onClick={() => setOpen((o) => ({ ...o, [group.label]: !o[group.label] }))}
                aria-expanded={isOpen}
                className={`mt-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide transition ${groupActive ? 'text-[#173b3b]' : 'text-[#173b3b]/50 hover:text-[#173b3b]'}`}
              >
                {group.label}
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {isOpen && (
                <div className="space-y-0.5 pl-2">
                  {group.items.map((item) => (
                    <SidebarLink key={item.href} item={item} active={isActive(item.href)} nested />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="border-t border-[#173b3b]/10 px-4 py-4">
        <a href="/" className="flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-[#173b3b]/70 hover:bg-[#e4eee8]">
          <ExternalLink size={14} /> View storefront
        </a>
        {user && (
          <p className="mt-2 truncate px-3 text-xs text-[#173b3b]/45">
            {user.name} · {user.role}
          </p>
        )}
      </div>
    </aside>
  )
}

function SidebarLink({ item, active, nested = false }: { item: Item; active: boolean; nested?: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2.5 rounded-full px-3 py-2 text-sm font-bold transition ${nested ? 'pl-6' : ''} ${active ? 'bg-[#173b3b] text-white' : 'text-[#173b3b]/70 hover:bg-[#e4eee8]'}`}
      aria-current={active ? 'page' : undefined}
    >
      <Icon size={15} /> {item.label}
    </Link>
  )
}