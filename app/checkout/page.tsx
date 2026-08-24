import StorefrontShell from '@/components/storefront/storefront-shell'
import CheckoutFlow from '@/components/storefront/checkout-flow'
import { getAddOns } from '@/lib/data/catalog'
import { getCompanyInfo, getSettingInt } from '@/lib/services/settings'
import { getDictionary, getLocale } from '@/lib/i18n'
import { DEFAULT_SETTINGS } from '@/lib/db/schema'

export const metadata = {
  title: 'Checkout — Go-Sewa',
  description: 'Complete your Go-Sewa rental booking.',
}

export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const [addOns, company, deliveryFeeCents, locale, dict] = await Promise.all([
    getAddOns(), getCompanyInfo(),
    getSettingInt('delivery_fee_cents', Number(DEFAULT_SETTINGS.delivery_fee_cents)),
    getLocale(), getDictionary(),
  ])
  return (
    <StorefrontShell whatsapp={company.whatsapp} company={company} dict={dict} locale={locale}>
      <CheckoutFlow addOns={addOns} whatsapp={company.whatsapp} deliveryFeeCents={deliveryFeeCents} />
    </StorefrontShell>
  )
}