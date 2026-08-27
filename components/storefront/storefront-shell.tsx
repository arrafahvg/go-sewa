'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, MessageCircle, ShoppingBag, X } from 'lucide-react'
import { loadCart, cartCount } from '@/lib/cart'
import LanguageSwitcher from '@/components/storefront/language-switcher'
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries'
import { pick } from '@/lib/i18n/dictionaries'

export type NavCategory = { slug: string; nameId: string; nameEn: string }

export default function StorefrontShell({
  children,
  whatsapp = '628123456789',
  company,
  dict,
  locale,
  adminSlot,
  navCategories = [],
}: {
  children: React.ReactNode
  whatsapp?: string
  company?: {
    businessName?: string
    logoUrl?: string
    businessEmail?: string
    businessAddress?: string
    instagramUrl?: string
    businessShortLocation?: string
  }
  dict: Dictionary
  locale: Locale
  /** Optional server-rendered slot next to the cart (e.g. staff Admin chip). */
  adminSlot?: React.ReactNode
  /** Staff-managed navbar categories (§43). Empty → only Home/Rent show. */
  navCategories?: NavCategory[]
}) {
  const navItems: { label: string; href: string }[] = [
    { label: dict.nav.home, href: '/' },
    { label: dict.nav.rent, href: '/rent' },
    ...navCategories.map((c) => ({
      label: pick(locale, c.nameEn, c.nameId),
      href: `/rent?category=${c.slug}`,
    })),
  ]
  const [menuOpen, setMenuOpen] = useState(false)
  const [count, setCount] = useState(0)
  const brand = company?.businessName || 'Go-Sewa'

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
            {company?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logoUrl} alt={brand} className="h-8 w-auto" />
            ) : (
              <>
                {brand.split(' ')[0].toLowerCase()}
                <span className="text-[#e76f51]">—</span>
                {brand.split(' ').slice(1).join(' ').toLowerCase()}
              </>
            )}
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-[#173b3b]/75 md:flex">
            {navItems.map((n) => (
              <Link key={n.href} href={n.href} className="transition hover:text-[#e76f51]">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {adminSlot}
            <LanguageSwitcher locale={locale} />
            <Link
              href="/checkout"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#173b3b]/10 bg-white transition hover:bg-[#e4eee8]"
              aria-label={dict.shell.cartAria}
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
              aria-label={dict.shell.menuAria}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="flex flex-col gap-4 border-t border-[#173b3b]/10 bg-[#f8f6f1] px-5 py-5 md:hidden">
            {navItems.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setMenuOpen(false)}
                className="text-sm font-semibold text-[#173b3b]/80"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main id="main-content">{children}</main>

      <footer className="border-t border-[#173b3b]/10 bg-[#e4eee8] px-5 py-12 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 sm:flex-row sm:items-end">
          <div>
            <p className="font-serif text-2xl font-bold">
              {company?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={company.logoUrl} alt={brand} className="h-8 w-auto" />
              ) : (
                <>
                  {brand.split(' ')[0].toLowerCase()}
                  <span className="text-[#e76f51]">—</span>
                  {brand.split(' ').slice(1).join(' ').toLowerCase()}
                </>
              )}
            </p>
            <p className="mt-3 max-w-xs text-sm leading-6 text-[#173b3b]/60">
              {company?.businessShortLocation
                ? `${company.businessShortLocation}. ${company.businessName || ''}`.trim()
                : company?.businessAddress || 'Better gear for better stories. Made with care in Bali.'}
            </p>
          </div>
          <div className="text-sm text-[#173b3b]/60">
            {company?.businessEmail && <p>{company.businessEmail}</p>}
            <p className="mt-1">{company?.businessAddress || 'Bali, Indonesia'}</p>
            {(company?.instagramUrl || company?.businessEmail) && (
              <div className="mt-3 flex flex-wrap gap-3">
                {company?.instagramUrl && (
                  <a href={company.instagramUrl} target="_blank" rel="noreferrer" className="font-bold text-[#387066] hover:underline">
                    Instagram
                  </a>
                )}
                {company?.businessEmail && (
                  <a href={`mailto:${company.businessEmail}`} className="font-bold text-[#387066] hover:underline">
                    Email
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </footer>

      <a
        href={`https://wa.me/${whatsapp}`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-xl transition hover:-translate-y-1"
      >
        <MessageCircle size={18} /> {dict.shell.chatUs}
      </a>
    </div>
  )
}