import type { PaymentDetails } from '@/lib/services/settings'

/**
 * Manual payment instructions block (§16): bank transfer accounts + QRIS image.
 * Receives already-resolved details (per-invoice overrides merged over global
 * settings via `resolvePaymentDetails`). Rendered on the admin invoice page and
 * the public /d/[token] share view — and therefore included in the print/PDF
 * output automatically. Renders nothing when nothing is configured.
 */
export default function PaymentInstructions({ details, title = 'Payment details' }: { details: PaymentDetails; title?: string }) {
  const { accounts, qrisImageUrl, instructions } = details
  if (accounts.length === 0 && !qrisImageUrl && !instructions) return null

  return (
    <section className="mt-8 rounded-2xl border border-[#173b3b]/10 bg-[#faf8f2] p-5 text-sm leading-6">
      <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">{title}</p>
      <div className="mt-3 flex flex-wrap gap-6">
        {accounts.length > 0 && (
          <div className="min-w-56 flex-1 space-y-3">
            {accounts.map((a, i) => (
              <div key={`${a.bankName}-${a.accountNumber}-${i}`}>
                <p className="font-bold">{a.bankName}</p>
                <p className="font-mono text-base tracking-wide">{a.accountNumber}</p>
                {a.accountHolder && <p className="text-xs text-[#173b3b]/60">a.n. {a.accountHolder}</p>}
              </div>
            ))}
          </div>
        )}
        {qrisImageUrl && (
          <div className="flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrisImageUrl} alt="QRIS payment code" className="h-40 w-40 rounded-xl border border-[#173b3b]/10 bg-white object-contain" />
            <p className="mt-1 text-xs font-semibold text-[#173b3b]/55">Scan to pay with QRIS</p>
          </div>
        )}
      </div>
      {instructions && <p className="mt-4 whitespace-pre-line text-xs text-[#173b3b]/65">{instructions}</p>}
    </section>
  )
}
