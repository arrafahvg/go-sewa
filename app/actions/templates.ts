'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/services/auth'
import {
  saveTemplate, regenerateDraftAgreements, countDraftAgreements,
  getActiveTemplateFields, type TemplateFields, type TemplateKind,
} from '@/lib/services/templates'

/**
 * Document template server actions (§21B; §54, §59, §63). Staff-guarded,
 * typed results so raw errors never reach the UI.
 */
type Result = { ok: true } | { ok: false; error: string }

const KINDS: TemplateKind[] = ['agreement', 'invoice']

function parseFields(input: Record<string, unknown>): TemplateFields {
  return {
    headerTitle: String(input.headerTitle ?? '').slice(0, 120),
    introLine: String(input.introLine ?? '').slice(0, 300),
    terms: String(input.terms ?? '').slice(0, 4000),
    footerNote: String(input.footerNote ?? '').slice(0, 500),
    signatureBlock: input.signatureBlock !== false && input.signatureBlock !== 'false',
  }
}

export async function saveTemplateAction(kind: string, input: Record<string, unknown>, regenerateDrafts: boolean): Promise<Result & { version?: number }> {
  const staff = await requireStaff()
  if (!staff) return { ok: false, error: 'You need staff permissions to edit templates.' }
  if (!KINDS.includes(kind as TemplateKind)) return { ok: false, error: 'Unknown template type.' }
  try {
    const { version } = await saveTemplate(kind as TemplateKind, parseFields(input), staff.id)
    let regenerated = 0
    if (regenerateDrafts && kind === 'agreement') {
      regenerated = await regenerateDraftAgreements(staff.id)
      revalidatePath('/admin/agreements/[id]', 'page')
    }
    revalidatePath('/admin/templates')
    return { ok: true, version }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong. Please try again.' }
  }
}

export async function getTemplateStateAction(kind: string) {
  const staff = await requireStaff()
  if (!staff) return { ok: false as const, error: 'Not authorized.' }
  if (!KINDS.includes(kind as TemplateKind)) return { ok: false as const, error: 'Unknown template type.' }
  const state = await getActiveTemplateFields(kind as TemplateKind)
  const draftCount = await countDraftAgreements()
  return { ok: true as const, ...state, draftCount }
}