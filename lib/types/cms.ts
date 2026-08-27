/**
 * Shared CMS content types (spec §42 — structured content, not raw HTML).
 * This file is pure and client-safe: both the admin editor UI and the server
 * services import from here.
 */

/** Homepage hero content block, edited from `/admin/content`. */
export type HomeHeroSection = {
  type: 'hero'
  /** Indonesian (default) copy — also used as fallback when an EN field is blank. */
  kicker: string
  headline: string
  sub: string
  /** English copy — optional; falls back to the Indonesian/default fields. */
  kickerEn?: string
  headlineEn?: string
  subEn?: string
  /** Admin-uploaded hero image URL. When empty, the storefront shows a bundled placeholder. */
  imageUrl?: string | null
  /** Alt text describing the hero image for accessibility/SEO. */
  imageAlt?: string
  imageAltEn?: string
}

/** Union of editable homepage sections stored on `cms_pages.home.sections`. */
export type HomeSection = HomeHeroSection

/** FAQ entry as shown/edited by the CMS. */
export type CmsFaq = {
  id: string
  question: string
  answer: string
  active: boolean
  sortOrder: number
}

/** Testimonial as shown/edited by the CMS. */
export type CmsTestimonial = {
  id: string
  name: string
  avatarUrl: string | null
  rating: number
  quote: string
  active: boolean
  sortOrder: number
}