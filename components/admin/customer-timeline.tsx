import Link from 'next/link'

/**
 * Customer activity timeline (spec §32). Server component — reads pre-fetched
 * events; every label comes from the audit log's real action/metadata (§80).
 */
const LABELS: Record<string, string> = {
  customer_updated: 'Profile details updated',
  identity_document_uploaded: 'ID document uploaded',
  identity_document_upload_failed: 'ID document upload failed',
  identity_document_verified: 'Identity document verified',
  checkout_completed: 'Device checked out to customer',
  checkin_completed: 'Device checked in (returned)',
  devices_assigned: 'Devices assigned',
  booking_status_changed: 'Booking status changed',
  booking_pricing_adjusted: 'Booking pricing adjusted by staff',
}

const BOOKING_CREATED_LABEL = 'Rental booked'
function labelFor(action: string): string {
  if (LABELS[action]) return LABELS[action]
  // booking_created_<channel> → "Rental booked" (+ channel shown as context)
  if (/^booking_created_/.test(action)) return BOOKING_CREATED_LABEL
  return action.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}
const CHANNELS: Record<string, string> = {
  online: 'online checkout', in_store: 'walk-in', phone: 'phone', whatsapp: 'WhatsApp',
}

function describe(action: string, meta: Record<string, unknown>): string {
  const bits: string[] = []
  if (action === 'booking_status_changed' && typeof meta.from === 'string' && typeof meta.to === 'string') {
    return `${String(meta.from).replace(/_/g, ' ')} → ${String(meta.to).replace(/_/g, ' ')}`
  }
  if (action === 'checkin_completed' && meta.damageNoted === true) bits.push('damage noted at inspection')
  if (typeof meta.deviceIds === 'object' && Array.isArray(meta.deviceIds) && meta.deviceIds.length > 0) {
    bits.push(`${meta.deviceIds.length} device(s)`)
  }
  if (meta.fields && Array.isArray(meta.fields) && meta.fields.length > 0) {
    bits.push(`fields: ${(meta.fields as string[]).join(', ')}`)
  }
  if (typeof meta.idType === 'string') bits.push(String(meta.idType).toUpperCase())
  return bits.join(' · ')
}

export default function CustomerTimeline({ events }: { events: { id: string; action: string; metadata: Record<string, unknown>; at: string; bookingId: string | null }[] }) {
  const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="rounded-2xl border border-[#173b3b]/10 bg-white p-6">
      <h2 className="font-bold">Activity timeline</h2>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-[#173b3b]/50">No recorded activity yet for this customer.</p>
      ) : (
        <ol className="mt-4 space-y-0">
          {events.map((e, i) => (
            <li key={e.id} className="relative flex gap-4 pb-5 last:pb-0">
              {/* connector line */}
              {i < events.length - 1 && <span aria-hidden className="absolute left-[7px] top-4 h-full w-px bg-[#173b3b]/15" />}
              <span className="mt-1.5 size-[15px] shrink-0 rounded-full border-2 border-[#387066] bg-white" />
              <div className="min-w-0 text-sm">
                <p className="font-bold">{labelFor(e.action)}</p>
                {(() => {
                  const d = describe(e.action, e.metadata)
                  const channel = /^booking_created_/.test(e.action) ? CHANNELS[e.action.slice('booking_created_'.length)] : undefined
                  const parts = [d, channel].filter(Boolean) as string[]
                  return parts.length > 0 ? <p className="text-xs text-[#173b3b]/60">{parts.join(' · ')}</p> : null
                })()}
                <p className="text-xs text-[#173b3b]/45">{fmt(e.at)}</p>
                {e.bookingId && (
                  <Link href={`/admin/bookings/${e.bookingId}`} className="font-mono text-xs font-bold text-[#387066] hover:underline">view booking →</Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}