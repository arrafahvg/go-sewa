'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, MessageCircle, ShoppingBag, User, X } from 'lucide-react'
import { loadCart, cartCount } from '@/lib/cart'

const NAV = [
  { label: 'Home', href: '/' },
  { label: 'Rent', href: '/rent' },
  { label: 'Phones', href: '/rent?category=smartphones' },
  { label: 'Cameras', href: '/rent?category=cameras' },
  { label: 'Action Cameras', href: '/rent?category=action-cameras' },
]

export default function StorefrontShell({ children, whatsapp = '628123456789' }: { children: React.ReactNode; whatsapp?: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(cartCount(loadCart()))
    const onStorage = () => setCount(cartCount(loadCart()))
    window.addEventListener('storefront-cart', onStorage)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storefront-cart', onStorage)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#f8f6f1] text-[#173b3b]">
      <header className="sticky top-0 z-40 border-b border-[#173b3b]/10 bg-[#f8f6f1]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="font-serif text-2xl font-bold tracking-tight">
            go<span className="text-[#e76f51]">—</span>sewa
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-[#173b3b]/75 md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="transition hover:text-[#e76f51]">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/account"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#173b3b]/10 bg-white transition hover:bg-[#e4eee8]"
              aria-label="My account"
            >
              <User size={18} />
            </Link>
            <Link
              href="/checkout"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#173b3b]/10 bg-white transition hover:bg-[#e4eee8]"
              aria-label="Rental cart"
            >
              <ShoppingBag size={18} />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e76f51] px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#173b3b]/10 bg-white md:hidden"
              aria-label="Menu"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="flex flex-col gap-4 border-t border-[#173b3b]/10 bg-[#f8f6f1] px-5 py-5 md:hidden">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setMenuOpen(false)}
                className="text-sm font-semibold text-[#173b3b]/80"
              >
                {n.label}
              </Link>
            ))}
            <Link href="/account" onClick={() => setMenuOpen(false)} className="text-sm font-semibold text-[#173b3b]/80">
              My account
            </Link>
          </nav>
        )}
      </header>

      <main>{children}</main>

      <footer className="border-t border-[#173b3b]/10 bg-[#e4eee8] px-5 py-12 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 sm:flex-row sm:items-end">
          <div>
            <p className="font-serif text-2xl font-bold">
              go<span className="text-[#e76f51]">—</span>sewa
            </p>
            <p className="mt-3 max-w-xs text-sm leading-6 text-[#173b3b]/60">
              Better gear for better stories. Made with care in Bali.
            </p>
          </div>
          <div className="text-sm text-[#173b3b]/60">
            <p>hello@gosewa.id</p>
            <p className="mt-1">Bali, Indonesia</p>
          </div>
        </div>
      </footer>

      <a
        href={`https://wa.me/${whatsapp}`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-xl transition hover:-translate-y-1"
      >
        <MessageCircle size={18} /> Chat us
      </a>
    </div>
  )
}