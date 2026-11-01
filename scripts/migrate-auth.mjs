import nextEnv from "@next/env"
import { readFile } from "node:fs/promises"
import pg from "pg"
nextEnv.loadEnvConfig(process.cwd())
if (!process.env.DATABASE_URL)
  throw new Error(
    "Configure DATABASE_URL in .env.local before applying the auth migration."
  )
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
try {
  await client.connect()
  await client.query("BEGIN")
  await client.query(
    await readFile(
      new URL(
        "../db/migrations/0001_telegram_login_links.sql",
        import.meta.url
      ),
      "utf8"
    )
  )
  await client.query("COMMIT")
  console.log(
    "Applied the additive Telegram login-link migration. Existing tables were not changed."
  )
} catch {
  await client.query("ROLLBACK").catch(() => {})
  console.error(
    "Migration failed. Check DATABASE_URL, connectivity and table-creation permissions."
  )
  process.exitCode = 1
} finally {
  await client.end()
}
