import 'dotenv/config'
import { Pool } from 'pg'

/**
 * Remove ALL seeded/demo data from the database while preserving the admin
 * user (better-auth tables: user, session, account, verification).
 * Run: npx tsx scripts/clear-seed.ts
 */
const AUTH_TABLES = ['user', 'session', 'account', 'verification']

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const { rows } = await pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%' AND tablename <> 'drizzle%'`,
  )
  const toClear = rows.map((r) => r.tablename).filter((t) => !AUTH_TABLES.includes(t))
  if (toClear.length === 0) {
    console.log('Nothing to clear.')
    await pool.end()
    return
  }
  const list = toClear.map((t) => `"${t}"`).join(', ')
  await pool.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`)
  console.log(`✅ Cleared ${toClear.length} tables:\n${toClear.join(', ')}`)
  const users = await pool.query<{ email: string; name: string }>('SELECT email, name FROM "user"')
  console.log('✅ Preserved users:', users.rows)
  await pool.end()
}

main().catch((err) => {
  console.error('❌ Clear failed:', err)
  process.exit(1)
})
