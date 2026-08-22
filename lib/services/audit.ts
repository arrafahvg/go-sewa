import { db } from '@/lib/db'
import { activityLogs } from '@/lib/db/schema'

/**
 * Append an audit-log entry (spec §63). Never throws — logging must not break a
 * business operation if the log write fails.
 */
export async function logActivity(input: {
  userId?: string | null
  action: string
  entity?: string | null
  entityId?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity ?? null,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? {},
    })
  } catch {
    // Intentionally swallow: audit logging is best-effort.
  }
}

export const uid = (): string => crypto.randomUUID()