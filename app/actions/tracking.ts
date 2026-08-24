'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/services/auth'
import { saveTrackingConfiguration, pollDeviceLocation, isTrackingConfigured } from '@/lib/services/tracking'

type Result = { ok: true } | { ok: false; error: string }

/** Staff-enroll a physical unit with the connected tracking provider (§41). */
export async function saveTrackingConfigAction(input: {
  deviceId: string
  externalDeviceId?: string | null
  enabled: boolean
  consentNote?: string | null
}): Promise<Result> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to configure tracking.' }
  try {
    await saveTrackingConfiguration(input, staff.id)
    revalidatePath('/admin/inventory')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save the tracking configuration.' }
  }
}

/**
 * Ask the connected provider for the unit's latest real location and store it.
 * With no provider connected this is a no-op that reports honestly (§80).
 */
export async function pollDeviceLocationAction(deviceId: string): Promise<{ ok: true; stored: boolean } | { ok: false; error: string }> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to refresh tracking.' }
  if (!(await isTrackingConfigured())) {
    return { ok: false, error: 'Tracking integration not configured — connect a provider first.' }
  }
  try {
    const stored = await pollDeviceLocation(deviceId)
    if (stored) revalidatePath('/admin/inventory')
    return { ok: true, stored }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'The provider did not report a location.' }
  }
}
