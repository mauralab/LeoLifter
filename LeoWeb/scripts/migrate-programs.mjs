import nextEnv from "@next/env"
import { readFile } from "node:fs/promises"
import pg from "pg"
nextEnv.loadEnvConfig(process.cwd())
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
try {
  if (!process.env.DATABASE_URL)
    throw new Error("Missing database configuration")
  await client.connect()
  await client.query("BEGIN")
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtextextended('leo:program-editor:v1',0))"
  )
  await client.query(
    await readFile(
      new URL(
        "../../LeoDatabase/Sql/0002_program_editor_layout.sql",
        import.meta.url
      ),
      "utf8"
    )
  )
  await client.query(
    await readFile(
      new URL(
        "../../LeoDatabase/Sql/0003_optional_program_sets.sql",
        import.meta.url
      ),
      "utf8"
    )
  )
  await client.query("COMMIT")
  console.log(
    "Program editor metadata and optional-set schema applied; existing programs preserved."
  )
} catch {
  await client.query("ROLLBACK").catch(() => {})
  console.error(
    "Program editor migration failed. Check database configuration; credentials omitted."
  )
  process.exitCode = 1
} finally {
  await client.end()
}
