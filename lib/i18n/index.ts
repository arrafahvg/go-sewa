import { cookies } from 'next/headers'
import dictionaries, { LOCALE_COOKIE, type Dictionary, type Locale } from '@/lib/i18n/dictionaries'
import { getSetting } from '@/lib/services/settings'

/**
 * Locale resolution for the customer-facing storefront (§9): explicit cookie
 * choice → `default_language` setting (§73) → Indonesian. No URL restructuring;
 * switching sets the cookie and refreshes server components.
 */

function isLocale(value: string | undefined | null): value is Locale {
  return value === 'id' || value === 'en'
}

export async function getLocale(): Promise<Locale> {
  try {
    const store = await cookies()
    const fromCookie = store.get(LOCALE_COOKIE)?.value
    if (isLocale(fromCookie)) return fromCookie
  } catch {
    // cookies() unavailable outside request scope — fall through to settings.
  }
  const fallback = await getSetting('default_language')
  return isLocale(fallback) ? fallback : 'id'
}

export async function getDictionary(locale?: Locale): Promise<Dictionary> {
  return dictionaries[locale ?? await getLocale()]
}

/** Pick between the two localized fields stored on catalog/content rows. */
export function pick<T>(locale: Locale, enValue: T, idValue: T): T {
  return locale === 'id' ? idValue : enValue
}

