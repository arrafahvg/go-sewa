import type { Metadata } from 'next'
import AdminConsole from '@/components/admin/console'
import { getBookingsWithDetail, getCustomers } from '@/lib/data/admin'
import { getCatalogProducts } from '@/lib/data/catalog'

export const metadata: Metadata = {
  title: 'Go-Sewa Admin — Operations',
  description: 'Manage Go-Sewa bookings, inventory, and customers.',
}

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const [bookings, customers, products] = await Promise.all([
    getBookingsWithDetail(),
    getCustomers(),
    getCatalogProducts(),
  ])
  return <AdminConsole bookings={bookings} customers={customers} products={products} />
}
