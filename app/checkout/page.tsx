import StorefrontShell from '@/components/storefront/storefront-shell'
import StaffAdminLink from '@/components/storefront/staff-admin-link'
import CheckoutFlow from '@/components/storefront/checkout-flow'
import { getAddOns, getNavCategories } from '@/lib/data/catalog'
import { getCompanyInfo, getSettingInt } from '@/lib/services/settings'
import { getDictionary, getLocale } from '@/lib/i18n'
import { DEFAULT_SETTINGS } from '@/lib/db/schema'

export const metadata = {
  title: 'Checkout — Go-Sewa',
  description: 'Complete your Go-Sewa rental booking.',
}

export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const [addOns, company, deliveryFeeCents, locale, dict, navCats] = await Promise.all([
    getAddOns(), getCompanyInfo(),
    getSettingInt('delivery_fee_cents', Number(DEFAULT_SETTINGS.delivery_fee_cents)),
    getLocale(), getDictionary(), getNavCategories(),
  ])
  return (
    <StorefrontShell whatsapp={company.whatsapp} company={company} dict={dict} locale={locale} adminSlot={<StaffAdminLink />} navCategories={navCats}>
      <CheckoutFlow addOns={addOns} whatsapp={company.whatsapp} deliveryFeeCents={deliveryFeeCents} dict={dict} />
    </StorefrontShell>
  )
}