/**
 * Tracking provider abstraction (§41).
 *
 * MARK: Integration point for real tracking providers
 * To connect a real provider (MDM system, GPS tracker vendor, manufacturer API):
 * 1. Implement `TrackingProvider` below (auth via env credentials — never hardcoded);
 * 2. Register it in `getTrackingProvider()` keyed by the `tracking_provider` setting;
 * 3. Feed real locations in via `recordTrackingEvent()` (poll or webhook).
 *
 * Until then the factory returns NoTrackingProvider and every UI surface shows an
 * honest "Tracking integration not configured" state — no invented GPS data (§80).
 */
export interface TrackingLocation {
  latitude: number
  longitude: number
  accuracyMeters?: number | null
  recordedAt: Date
  payload?: Record<string, unknown>
}

export interface TrackingProvider {
  readonly name: string
  /** Query the external system for the unit's latest known location. */
  fetchLatestLocation(externalDeviceId: string): Promise<TrackingLocation | null>
}

/** Default provider when nothing is connected. Always yields no location. */
export class NoTrackingProvider implements TrackingProvider {
  readonly name = 'none'
  async fetchLatestLocation(): Promise<TrackingLocation | null> {
    return null
  }
}

export function getTrackingProvider(providerSetting?: string): TrackingProvider {
  // MARK: Configuration point for cloud tracking providers.
  switch (providerSetting) {
    // case 'mdm-example': return new MdmExampleProvider(process.env.MDM_API_KEY!)
    default:
      return new NoTrackingProvider()
  }
}
