import "server-only"
import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import { AuthConfigurationError } from "@/lib/auth/errors"

const globalForDb = globalThis as unknown as { leoPool?: Pool }
export function getDb() {
  if (!process.env.DATABASE_URL)
    throw new AuthConfigurationError("Configure LeoWeb DATABASE_URL.")
  const pool = (globalForDb.leoPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 10000,
  }))
  if (!pool.listenerCount("error"))
    pool.on("error", () => console.error("Database pool connection lost."))
  return drizzle(pool)
}
