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
    "SELECT pg_advisory_xact_lock(hashtextextended('leo:workout-editor:v1',0))"
  )
  await client.query(
    await readFile(
      new URL("../../LeoDatabase/Sql/0004_workout_editor.sql", import.meta.url),
      "utf8"
    )
  )
  await client.query("COMMIT")
  console.log("Workout editor metadata applied; existing workouts preserved.")
} catch {
  await client.query("ROLLBACK").catch(() => {})
  console.error(
    "Workout editor migration failed. Check database configuration; credentials omitted."
  )
  process.exitCode = 1
} finally {
  await client.end()
}
