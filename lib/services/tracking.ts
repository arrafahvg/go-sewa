import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  deviceTrackingConfigurations, deviceTrackingEvents, devices,
} from '@/lib/db/schema'
import { getSetting } from '@/lib/services/settings'
import { logActivity, uid } from '@/lib/services/audit'
import { getTrackingProvider } from '@/lib/services/tracking/provider'

/**
 * Device tracking service (§41). Real providers only: locations are stored when a
 * connected provider reports them; with no provider configured every query
 * returns an explicit "not configured" state instead of fake data (§80).
 */

export type TrackingStatus =
  | { available: false; reason: 'no_provider' | 'not_enrolled' | 'disabled' }
  | { available: true; provider: string; lastEvent: {
      latitude: number | null
      longitude: number | null
      accuracyMeters: number | null
      recordedAt: Date
    } | null }

/** Whether any tracking provider is connected globally (settings §73). */
export async function isTrackingConfigured(): Promise<boolean> {
  const provider = (await getSetting('tracking_provider')).trim()
  return provider !== ''
}

/** Resolve the tracking status of one physical unit for UI rendering. */
export async function getTrackingStatus(deviceId: string): Promise<TrackingStatus> {
  const providerName = (await getSetting('tracking_provider')).trim()
  if (!providerName) return { available: false, reason: 'no_provider' }

  const config = (await db.select().from(deviceTrackingConfigurations)
    .where(eq(deviceTrackingConfigurations.deviceId, deviceId)).limit(1))[0]
  if (!config) return { available: false, reason: 'not_enrolled' }
  if (!config.enabled) return { available: false, reason: 'disabled' }

  const event = (await db.select().from(deviceTrackingEvents)
    .where(eq(deviceTrackingEvents.deviceId, deviceId))
    .orderBy(desc(deviceTrackingEvents.recordedAt)).limit(1))[0]

  return {
    available: true,
    provider: config.provider,
    lastEvent: event
      ? {
          latitude: event.latitude,
          longitude: event.longitude,
          accuracyMeters: event.accuracyMeters,
          recordedAt: event.recordedAt,
        }
      : null,
  }
}

/** Staff-enroll a unit with the configured provider (or update its enrollment). */
export async function saveTrackingConfiguration(input: {
  deviceId: string
  externalDeviceId?: string | null
  enabled: boolean
  consentNote?: string | null
}, byUserId?: string | null): Promise<void> {
  const device = (await db.select({ id: devices.id }).from(devices).where(eq(devices.id, input.deviceId)).limit(1))[0]
  if (!device) throw new Error('Device not found.')
  const provider = (await getSetting('tracking_provider')).trim()
  if (!provider) throw new Error('No tracking provider is connected — configure it first.')

  await db.insert(deviceTrackingConfigurations).values({
    id: uid(),
    deviceId: input.deviceId,
    provider,
    externalDeviceId: input.externalDeviceId?.trim() || null,
    enabled: input.enabled,
    consentNote: input.consentNote?.trim() || null,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: deviceTrackingConfigurations.deviceId,
    set: {
      provider,
      externalDeviceId: input.externalDeviceId?.trim() || null,
      enabled: input.enabled,
      consentNote: input.consentNote?.trim() || null,
      updatedAt: new Date(),
    },
  })

  await logActivity({
    userId: byUserId,
    action: 'device_tracking_configured',
    entity: 'device',
    entityId: input.deviceId,
    metadata: { provider, enabled: input.enabled },
  })
}

/**
 * Store a real location reported by the connected provider. Called by provider
 * integrations (poll loop or webhook handler) — never by UI, never with
 * synthesized coordinates. Returns null when the provider has nothing new.
 */
export async function pollDeviceLocation(deviceId: string): Promise<boolean> {
  const config = (await db.select().from(deviceTrackingConfigurations)
    .where(eq(deviceTrackingConfigurations.deviceId, deviceId)).limit(1))[0]
  if (!config || !config.enabled || !config.externalDeviceId) return false

  const provider = getTrackingProvider(await getSetting('tracking_provider'))
  const location = await provider.fetchLatestLocation(config.externalDeviceId)
  if (!location) return false

  await db.insert(deviceTrackingEvents).values({
    id: uid(),
    deviceId,
    provider: config.provider,
    latitude: location.latitude,
    longitude: location.longitude,
    accuracyMeters: location.accuracyMeters ?? null,
    payload: location.payload ?? {},
    recordedAt: location.recordedAt,
  })
  return true
}
