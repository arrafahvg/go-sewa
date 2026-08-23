import StorefrontShell from '@/components/storefront/storefront-shell'
import CheckoutFlow from '@/components/storefront/checkout-flow'
import { getAddOns } from '@/lib/data/catalog'
import { getCompanyInfo } from '@/lib/services/settings'

export const metadata = {
  title: 'Checkout — Go-Sewa',
  description: 'Complete your Go-Sewa rental booking.',
}

export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const [addOns, company] = await Promise.all([getAddOns(), getCompanyInfo()])
  return (
    <StorefrontShell whatsapp={company.whatsapp} company={company}>
      <CheckoutFlow addOns={addOns} whatsapp={company.whatsapp} />
    </StorefrontShell>
  )
}