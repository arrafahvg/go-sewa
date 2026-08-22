import StorefrontShell from '@/components/storefront/storefront-shell'
import CheckoutFlow from '@/components/storefront/checkout-flow'
import { getAddOns } from '@/lib/data/catalog'
import { getWhatsappNumber } from '@/lib/services/settings'

export const metadata = {
  title: 'Checkout — Go-Sewa',
  description: 'Complete your Go-Sewa rental booking.',
}

export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const [addOns, whatsapp] = await Promise.all([getAddOns(), getWhatsappNumber()])
  return (
    <StorefrontShell whatsapp={whatsapp}>
      <CheckoutFlow addOns={addOns} whatsapp={whatsapp} />
    </StorefrontShell>
  )
}