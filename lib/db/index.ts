import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

/**
 * Serverless-friendly connection pool (§81).
 *
 * On Vercel every serverless function gets its own pool instance, and a lazy
 * module-level `new Pool()` stays idle until the first real query. Under a cold
 * start (or a transient Supabase pooler blip) the very first connection can
 * stall; without a connection/idle timeout that stall becomes a hung server
 * render that Vercel kills — surfacing as React #441 / #419 ("couldn't finish
 * this Suspense boundary"). These timeouts make the pool fail *fast* so a caller
 * can retry instead of crashing the page.
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DATABASE_MAX_CONNECTIONS ?? 8),
  connectionTimeoutMillis: Number(process.env.DATABASE_CONNECTION_TIMEOUT_MS ?? 8000),
  idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT_MS ?? 30000),
  // In serverless, close idle connections so we never hold a stale socket open.
  allowExitOnIdle: true,
})

// A connection that errors asynchronously (only happens after the socket died)
// must never crash the whole process — the next dbRequest will simply reconnect.
pool.on('error', (err) => {
  if (process.env.NODE_ENV !== 'production') console.error('[db] pool error', err)
})

export const db = drizzle(pool, { schema })

const TRANSIENT = /timeout|connection|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|pool|idle/i

/**
 * Run a DB read with a bounded, one-shot retry for transient failures (cold
 * starts, a dead pooled socket, a momentarily saturated pooler). Any DB-backed
 * page should route its reads through this so a transient blip degrades to a
 * successful response instead of a crashed server render.
 *
 * @returns the query result, or throws the last error after all retries.
 */
export async function dbRequest<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const transient = err instanceof Error && TRANSIENT.test(err.message)
      if (attempt >= retries || !transient) break
      await new Promise((r) => setTimeout(r, 200 * (attempt + 1)))
    }
  }
  throw lastErr
}
