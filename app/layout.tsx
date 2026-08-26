import { Analytics } from '@vercel/analytics/next'
import { getSettings } from '@/lib/services/settings'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  const favicon = s['favicon_url'] || '/favicon.svg'
  return {
    title: 'Go-Sewa — Better gear for better stories',
    description: 'Premium smartphone, camera, and creator gear rentals in Bali.',
    generator: 'v0.app',
    // Browser favicon — admin-managed via /admin/settings (§42); bundled SVG fallback.
    icons: { icon: [{ url: favicon, type: favicon.endsWith('.svg') ? 'image/svg+xml' : undefined }] },
  }
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className="bg-background">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}