'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, Users, UserPlus, Wrench, ReceiptText,
  FileText, Settings, UserRound, ExternalLink, ChevronLeft, ChevronRight, Menu, Store,
} from 'lucide-react'

const isActive = (pathname: string, href: string) =>
  href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

export default function AdminShell({
  user,
  children,
}: {
  user: { name: string; role: string } | null
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Remember the collapsed preference between visits.
  useEffect(() => {
    const saved = window.localStorage.getItem('gs-admin-collapsed')
    if (saved === '1') setCollapsed(true)
  }, [])
  useEffect(() => {
    window.localStorage.setItem('gs-admin-collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#173b3b] lg:flex">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-[#173b3b]/10 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/admin" className="font-serif text-lg font-bold">
          go<span className="text-[#e76f51]">—</span>sewa<span className="ml-1 text-xs font-normal text-[#173b3b]/50">admin</span>
        </Link>
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="rounded-full border border-[#173b3b]/10 bg-white p-2">
          <Menu size={18} />
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-[#173b3b]/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden />
      )}

      {/* Sidebar — fixed icon rail on desktop, off-canvas drawer on mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-gradient-to-b from-[#12312f] via-[#173b3b] to-[#0e2625] text-white shadow-2xl transition-all duration-300 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${collapsed ? 'w-[76px]' : 'w-72'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <NavContent user={user} collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} onNavigate={() => setMobileOpen(false)} />
      </aside>

      <main className="min-w-0">
        {children}
      </main>
    </div>
  )
}

type Item = { label: string; href: string; icon: React.ComponentType<{ size?: number }> }
type Group = { label: string; items: Item[] }

const TOP_ITEMS: Item[] = [{ label: 'Overview', href: '/admin', icon: LayoutDashboard }]

const GROUPS: Group[] = [
  { label: 'Catalog', items: [{ label: 'Inventory', href: '/admin/inventory', icon: Package }] },
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
      { label: 'Account settings', href: '/admin/settings/account', icon: UserRound },
    ],
  },
]

function NavContent({ user, collapsed, onToggle, onNavigate }: {
  user: { name: string; role: string } | null
  collapsed: boolean
  onToggle: () => void
  onNavigate: () => void
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GROUPS.map((g) => [g.label, true])))
  const active = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href))

  return (
    <div className="flex h-full flex-col">
      <div className={`flex items-center border-b border-white/10 ${collapsed ? 'h-16 justify-center px-2' : 'justify-between px-5 py-4'}`}>
        {collapsed ? (
          <Link href="/admin" aria-label="Go-Sewa admin" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 font-serif text-lg font-bold">
            g<span className="text-[#ff8a65]">—</span>s
          </Link>
        ) : (
          <Link href="/admin" className="font-serif text-xl font-bold">
            go<span className="text-[#ff8a65]">—</span>sewa
            <span className="ml-1 text-xs font-normal text-white/40">admin</span>
          </Link>
        )}
        {!collapsed && (
          <button onClick={onToggle} aria-label="Collapse sidebar" className="rounded-full p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white">
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto py-4 px-3">
        {TOP_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} active={active(item.href)} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
        {GROUPS.map((group) => {
          const groupActive = group.items.some((i) => active(i.href))
          if (collapsed) {
            return (
              <div key={group.label} className="group/rail relative">
                {(() => { const GIcon = group.items[0].icon; return (
                  <span className={`mt-2 flex h-11 w-11 cursor-default items-center justify-center rounded-xl ${groupActive ? 'bg-white/15 text-white' : 'text-white/45'}`}>
                    <GIcon size={18} />
                  </span>
                ) })()}
                <div className="pointer-events-none invisible absolute left-full top-0 z-50 ml-2 w-52 rounded-2xl border border-[#173b3b]/10 bg-white p-2 opacity-0 shadow-2xl transition group-hover/rail:pointer-events-auto group-hover/rail:visible group-hover/rail:opacity-100">
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#173b3b]/40">{group.label}</p>
                  {group.items.map((item) => (
                    <FlyoutLink key={item.href} item={item} active={active(item.href)} onNavigate={onNavigate} />
                  ))}
                </div>
              </div>
            )
          }
          const isOpen = open[group.label]
          return (
            <div key={group.label}>
              <button
                onClick={() => setOpen((o) => ({ ...o, [group.label]: !o[group.label] }))}
                aria-expanded={isOpen}
                className={`mt-3 flex w-full items-center justify-between px-3 pb-1 text-[10px] font-bold uppercase tracking-[.14em] transition ${groupActive ? 'text-white/80' : 'text-white/35 hover:text-white/70'}`}
              >
                {group.label}
                <ChevronRight size={13} className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
              </button>
              {isOpen && (
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink key={item.href} item={item} active={active(item.href)} collapsed={false} nested onNavigate={onNavigate} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
      {/* Footer: expand toggle (rail), storefront, user card */}
      <div className="border-t border-white/10 p-3">
        {collapsed && (
          <button onClick={onToggle} aria-label="Expand sidebar" className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl text-white/50 transition hover:bg-white/10 hover:text-white">
            <ChevronRight size={16} />
          </button>
        )}
        <a href="/" className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-white/60 transition hover:bg-white/10 hover:text-white ${collapsed ? 'justify-center px-0' : ''}`}>
          <ExternalLink size={15} /> {!collapsed && 'View storefront'}
        </a>
        {!collapsed && user && (
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e76f51] text-xs font-bold">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">{user.name}</p>
              <p className="truncate text-[10px] uppercase tracking-wide text-white/40">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function NavLink({ item, active, collapsed, nested = false, onNavigate }: {
  item: Item
  active: boolean
  collapsed: boolean
  nested?: boolean
  onNavigate: () => void
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={[
        'group flex items-center gap-3 rounded-xl text-sm font-semibold transition-all duration-150',
        collapsed ? 'mx-auto mt-1 h-11 w-11 justify-center' : `${nested ? 'pl-6 pr-3' : 'px-3'} mt-0.5 py-2.5`,
        active
          ? 'bg-gradient-to-r from-[#e76f51] to-[#f08a5d] text-white shadow-lg shadow-[#e76f51]/25'
          : 'text-white/60 hover:bg-white/10 hover:text-white',
      ].join(' ')}
    >
      <Icon size={17} />
      {!collapsed && item.label}
    </Link>
  )
}

function FlyoutLink({ item, active, onNavigate }: { item: Item; active: boolean; onNavigate: () => void }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${active ? 'bg-[#e76f51]/10 text-[#c2472a]' : 'text-[#173b3b]/75 hover:bg-[#e4eee8]'}`}
    >
      <Icon size={15} /> {item.label}
    </Link>
  )
}

