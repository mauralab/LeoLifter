import nextEnv from "@next/env"
import { readFile, readdir } from "node:fs/promises"
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
  const directory = new URL("../db/migrations/", import.meta.url)
  const migrations = (await readdir(directory))
    .filter((name) => /^\d+_.*\.sql$/.test(name))
    .sort()
  for (const name of migrations)
    await client.query(await readFile(new URL(name, directory), "utf8"))
  await client.query("COMMIT")
  console.log(
    "Applied additive authentication migrations. Existing application tables were not changed."
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
