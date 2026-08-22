import { seed } from '../lib/db/seed'

seed()
  .then(() => {
    console.log('✅ Go-Sewa seed completed.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  })