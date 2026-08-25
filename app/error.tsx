'use client'

import { useEffect } from 'react'

/**
 * Root error boundary (§61). Catches an unhandled client/server-render error and
 * shows a calm, on-brand fallback with a retry button instead of the raw
 * "Application error" page. The `reset` from Next re-runs the failed render;
 * navigating to /rent is the fallback for anything the reset can't clear.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[rendered-error]', error)
  }, [error])

  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[#e76f51]">
        Terjadi kendala / Something went wrong
      </p>
      <h1 className="mt-4 font-serif text-4xl tracking-tight text-[#173b3b] sm:text-5xl">
        Halaman tidak dapat dimuat
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-[#173b3b]/65">
        Ada gangguan sesaat di sistem kami. Silakan muat ulang — jika berlanjut,
        hubungi kami lewat WhatsApp.
      </p>
      <p className="mt-1 max-w-md text-xs text-[#173b3b]/50">
        There was a temporary glitch. Please reload — or reach us on WhatsApp if it persists.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          onClick={() => reset()}
          className="rounded-full bg-[#173b3b] px-7 py-4 text-sm font-bold text-white transition hover:opacity-90"
        >
          Muat ulang / Reload
        </button>
        <a
          href="/rent"
          className="rounded-full border border-[#173b3b]/15 bg-white px-7 py-4 text-sm font-bold text-[#173b3b] transition hover:bg-[#e4eee8]"
        >
          Lihat katalog / Browse catalog
        </a>
      </div>
      <span className="mt-10 font-mono text-[10px] text-[#173b3b]/40">
        {error.digest ? `Ref: ${error.digest}` : 'Go-Sewa'}
      </span>
    </main>
  )
}