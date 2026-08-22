import type { Metadata } from 'next'
import AdminConsole from '@/components/admin/console'
import { getBookingsWithDetail, getCustomers } from '@/lib/data/admin'
import { getCatalogProducts } from '@/lib/data/catalog'
import { markOverdueRentals } from '@/lib/services/overdue'

export const metadata: Metadata = {
  title: 'Go-Sewa Admin — Operations',
  description: 'Manage Go-Sewa bookings, inventory, and customers.',
}

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  // Opportunistic overdue sweep so staff always sees current state (§17).
  await markOverdueRentals()
  const [bookings, customers, products] = await Promise.all([
    getBookingsWithDetail(),
    getCustomers(),
    getCatalogProducts(),
  ])
  return <AdminConsole bookings={bookings} customers={customers} products={products} />
}
