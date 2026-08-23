import type { Metadata } from 'next'
import HeroEditor from '@/components/admin/hero-editor'
import FaqEditor from '@/components/admin/faq-editor'
import TestimonialsEditor from '@/components/admin/testimonials-editor'
import { getHomeSections, listFaq, listTestimonials } from '@/lib/services/cms'

export const metadata: Metadata = {
  title: 'Go-Sewa Admin — Content',
  description: 'Edit storefront content: homepage hero, FAQ and testimonials.',
}

export const dynamic = 'force-dynamic'

export default async function ContentPage() {
  const [sections, faq, testimonials] = await Promise.all([
    getHomeSections(), listFaq(), listTestimonials(),
  ])

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#173b3b]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-xs font-bold uppercase tracking-wide text-[#173b3b]/45">
          <a href="/admin" className="hover:underline">Admin</a> / Content
        </p>
        <div className="mt-2">
          <h1 className="font-serif text-3xl tracking-tight">Content</h1>
          <p className="mt-1 max-w-lg text-sm text-[#173b3b]/60">
            Manage the storefront&apos;s editorial content — the homepage hero, FAQ and customer
            testimonials (spec §42). Saved changes appear on the storefront immediately.
          </p>
        </div>
        <HeroEditor sections={sections} />
        <FaqEditor items={faq} />
        <TestimonialsEditor items={testimonials} />
      </div>
    </div>
  )
}