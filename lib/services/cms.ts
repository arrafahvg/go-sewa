import { eq, asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { cmsPages, faq, testimonials } from '@/lib/db/schema'
import { uid, logActivity } from './audit'
import type { HomeSection, CmsFaq, CmsTestimonial } from '@/lib/types/cms'

/**
 * Content CMS service (spec §42). Business content (hero, FAQ, testimonials)
 * lives in the DB as structured data — not hardcoded in components (§73) and
 * not raw HTML. The storefront reads via these helpers; the admin UI writes
 * through `app/actions/cms.ts`.
 */

const HOME_SLUG = 'home'

export const DEFAULT_HOME_SECTIONS: HomeSection[] = [
  {
    type: 'hero',
    kicker: 'Rent the tech you need, when you need it.',
    headline: 'Choose your gear. Book it. Enjoy.',
    sub: 'Rent premium smartphones, action cameras, 360 cameras and creator gear for your trip, project, adventure or content.',
  },
]

/** Load the home page sections, falling back to defaults if not yet customised. */
export async function getHomeSections(): Promise<HomeSection[]> {
  const rows = await db.select().from(cmsPages).where(eq(cmsPages.slug, HOME_SLUG)).limit(1)
  const sections = (rows[0]?.sections ?? []) as unknown as HomeSection[]
  return sections.length > 0 ? sections : DEFAULT_HOME_SECTIONS
}

async function ensureHomeRow(): Promise<string> {
  const rows = await db.select().from(cmsPages).where(eq(cmsPages.slug, HOME_SLUG)).limit(1)
  if (rows[0]) return rows[0].id
  const id = uid()
  await db.insert(cmsPages).values({
    id, slug: HOME_SLUG, title: 'Home', sections: [],
    active: true, updatedAt: new Date(),
  })
  return id
}

/** Upsert the home page sections (admin, audit-logged). */
export async function saveHomeSections(sections: HomeSection[], byUserId: string): Promise<void> {
  const id = await ensureHomeRow()
  await db.update(cmsPages).set({
    sections: sections as unknown as Record<string, unknown>[],
    updatedAt: new Date(),
  }).where(eq(cmsPages.id, id))
  await logActivity({
    userId: byUserId, action: 'cms_home_updated',
    entity: 'cms_pages', entityId: HOME_SLUG,
    metadata: { sectionCount: sections.length },
  })
}

export async function listFaq(): Promise<CmsFaq[]> {
  const rows = await db.select().from(faq).orderBy(asc(faq.sortOrder))
  return rows.map((r) => ({
    id: r.id, question: r.questionEn, answer: r.answerEn,
    active: r.active, sortOrder: r.sortOrder,
  }))
}

/** Create or update a FAQ entry. Preserves question_id/answer_id on update. */
export async function saveFaqItem(
  input: { id?: string; question: string; answer: string; active?: boolean },
  byUserId: string,
): Promise<void> {
  const question = input.question.trim()
  const answer = input.answer.trim()
  if (!question || !answer) throw new Error('Question and answer are required.')
  if (input.id) {
    await db.update(faq).set({
      questionEn: question, answerEn: answer, active: input.active ?? true,
    }).where(eq(faq.id, input.id))
  } else {
    const maxRows = await db.select().from(faq).orderBy(asc(faq.sortOrder))
    const sortOrder = maxRows.length ? (maxRows[maxRows.length - 1].sortOrder + 1) : 0
    await db.insert(faq).values({
      id: uid(), questionId: uid(), questionEn: question,
      answerId: uid(), answerEn: answer,
      active: input.active ?? true, sortOrder,
    })
  }
  await logActivity({
    userId: byUserId, action: input.id ? 'faq_updated' : 'faq_created',
    entity: 'faq', entityId: input.id ?? undefined,
  })
}

export async function deleteFaqItem(id: string, byUserId: string): Promise<void> {
  await db.delete(faq).where(eq(faq.id, id))
  await logActivity({ userId: byUserId, action: 'faq_deleted', entity: 'faq', entityId: id })
}

export async function listTestimonials(): Promise<CmsTestimonial[]> {
  const rows = await db.select().from(testimonials).orderBy(asc(testimonials.sortOrder))
  return rows.map((r) => ({
    id: r.id, name: r.name, avatarUrl: r.avatarUrl, rating: r.rating,
    quote: r.quoteEn, active: r.active, sortOrder: r.sortOrder,
  }))
}

/** Create or update a testimonial. */
export async function saveTestimonialItem(
  input: { id?: string; name: string; quote: string; rating?: number; avatarUrl?: string | null; active?: boolean },
  byUserId: string,
): Promise<void> {
  const name = input.name.trim()
  const quote = input.quote.trim()
  if (!name || !quote) throw new Error('Name and quote are required.')
  const rating = Math.min(5, Math.max(1, Math.round(input.rating ?? 5)))
  if (input.id) {
    await db.update(testimonials).set({
      name, quoteEn: quote, rating, avatarUrl: input.avatarUrl ?? null,
      active: input.active ?? true,
    }).where(eq(testimonials.id, input.id))
  } else {
    const maxRows = await db.select().from(testimonials).orderBy(asc(testimonials.sortOrder))
    const sortOrder = maxRows.length ? (maxRows[maxRows.length - 1].sortOrder + 1) : 0
    await db.insert(testimonials).values({
      id: uid(), name, quoteId: uid(), quoteEn: quote, rating,
      avatarUrl: input.avatarUrl ?? null, active: input.active ?? true, sortOrder,
    })
  }
  await logActivity({
    userId: byUserId, action: input.id ? 'testimonial_updated' : 'testimonial_created',
    entity: 'testimonials', entityId: input.id ?? undefined,
  })
}

export async function deleteTestimonialItem(id: string, byUserId: string): Promise<void> {
  await db.delete(testimonials).where(eq(testimonials.id, id))
  await logActivity({ userId: byUserId, action: 'testimonial_deleted', entity: 'testimonials', entityId: id })
}

/** SEO metadata stored on the `home` cms_pages row (§42). */
export type HomeSeo = { seoTitle: string; seoDescription: string; noindex: boolean }

export async function getHomeSeo(): Promise<HomeSeo> {
  const row = (await db.select().from(cmsPages).where(eq(cmsPages.slug, HOME_SLUG)).limit(1))[0]
  return {
    seoTitle: row?.seoTitle ?? '',
    seoDescription: row?.seoDescription ?? '',
    noindex: row?.noindex ?? false,
  }
}

/** Upsert SEO metadata on the home page row (admin, audit-logged). */
export async function saveHomeSeo(input: HomeSeo, byUserId: string): Promise<void> {
  const id = await ensureHomeRow()
  await db.update(cmsPages).set({
    seoTitle: input.seoTitle.trim() || null,
    seoDescription: input.seoDescription.trim() || null,
    noindex: input.noindex,
    updatedAt: new Date(),
  }).where(eq(cmsPages.id, id))
  await logActivity({
    userId: byUserId, action: 'cms_seo_updated',
    entity: 'cms_pages', entityId: HOME_SLUG,
    metadata: { noindex: input.noindex },
  })
}