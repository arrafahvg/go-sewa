import type { Metadata } from 'next'
import SiteSettingsForm from '@/components/admin/site-settings'
import { getSettings } from '@/lib/services/settings'

export const metadata: Metadata = {
  title: 'Go-Sewa Admin — Settings',
  description: 'Company profile and site settings for the Go-Sewa storefront.',
}

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const settings = await getSettings()

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#173b3b]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">
          <a href="/admin" className="hover:underline">Admin</a> / Settings
        </p>
        <div className="mt-2">
          <h1 className="font-serif text-3xl tracking-tight">Company &amp; site settings</h1>
          <p className="mt-1 max-w-lg text-sm text-[#173b3b]/60">
            Manage the business details that show on the public storefront — logo, contact, address and social links
            (spec §42). No code changes required.
          </p>
        </div>
        <SiteSettingsForm initial={settings} />
      </div>
    </div>
  )
}