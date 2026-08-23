/**
 * Shared CMS content types (spec §42 — structured content, not raw HTML).
 * This file is pure and client-safe: both the admin editor UI and the server
 * services import from here.
 */

/** Homepage hero content block, edited from `/admin/content`. */
export type HomeHeroSection = {
  type: 'hero'
  kicker: string
  headline: string
  sub: string
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