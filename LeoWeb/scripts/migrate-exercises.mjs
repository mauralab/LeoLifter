import nextEnv from "@next/env"
import { readFile } from "node:fs/promises"
import pg from "pg"
nextEnv.loadEnvConfig(process.cwd())
if (!process.env.DATABASE_URL)
  throw new Error(
    "Configure DATABASE_URL before applying the exercise schema upgrade."
  )
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
try {
  await client.connect()
  await client.query("BEGIN")
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtextextended('leo:exercise-schema:v1', 0))"
  )
  await client.query(
    await readFile(
      new URL(
        "../../LeoDatabase/Sql/0001_exercise_localization_media.sql",
        import.meta.url
      ),
      "utf8"
    )
  )
  await client.query("COMMIT")
  console.log(
    "Applied exercise localization and media schema. Existing exercise records were preserved."
  )
} catch {
  await client.query("ROLLBACK").catch(() => {})
  console.error(
    "Exercise schema upgrade failed. Check database access and the existing schema; credentials omitted."
  )
  process.exitCode = 1
} finally {
  await client.end()
}
