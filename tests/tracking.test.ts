import { describe, expect, it } from 'vitest'
import { getTrackingProvider, NoTrackingProvider } from '@/lib/services/tracking/provider'

describe('tracking provider abstraction (§41)', () => {
  it('defaults to NoTrackingProvider when nothing is configured', () => {
    expect(getTrackingProvider('')).toBeInstanceOf(NoTrackingProvider)
    expect(getTrackingProvider(undefined)).toBeInstanceOf(NoTrackingProvider)
    expect(getTrackingProvider('unknown-provider').name).toBe('none')
  })

  it('never yields a location without a real integration (§80)', async () => {
    const provider = getTrackingProvider('')
    expect(await provider.fetchLatestLocation('whatever-external-id')).toBeNull()
  })
})
