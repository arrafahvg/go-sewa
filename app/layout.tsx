import { Analytics } from '@vercel/analytics/next'
import { getSettings } from '@/lib/services/settings'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  const favicon = s['favicon_url'] || '/favicon.png'
  return {
    title: 'Go-Sewa — Better gear for better stories',
    description: 'Premium smartphone, camera, and creator gear rentals in Bali.',
    generator: 'v0.app',
    // Browser favicon — admin-managed via /admin/settings (§42); bundled PNG fallback.
    icons: {
      icon: [
        { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
        { url: '/favicon-64.png', sizes: '64x64', type: 'image/png' },
        { url: favicon, type: favicon.endsWith('.svg') ? 'image/svg+xml' : 'image/png' },
      ],
      apple: '/apple-icon.png',
    },
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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[#173b3b] focus:px-5 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}