'use client'

import { useRouter } from 'next/navigation'
import { Languages } from 'lucide-react'
import { LOCALE_COOKIE, type Locale } from '@/lib/i18n/dictionaries'

/**
 * Language toggle (§9): writes the locale cookie and refreshes server
 * components so every customer-facing string re-renders in the new language.
 */
export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter()
  function switchTo(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`
    router.refresh()
  }
  return (
    <div className="flex items-center gap-1 rounded-full border border-[#173b3b]/10 bg-white px-1 py-1 text-[11px] font-bold">
      <Languages size={13} className="ml-1 text-[#173b3b]/50" />
      {(['id', 'en'] as Locale[]).map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          aria-pressed={locale === l}
          className={`rounded-full px-2 py-0.5 uppercase transition ${locale === l ? 'bg-[#173b3b] text-white' : 'text-[#173b3b]/55 hover:bg-[#e4eee8]'}`}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
