import nextEnv from "@next/env"
import { readFile } from "node:fs/promises"
import pg from "pg"
nextEnv.loadEnvConfig(process.cwd())
const seeds = JSON.parse(
  await readFile(new URL("../db/seeds/exercises.json", import.meta.url), "utf8")
)
if (!process.env.DATABASE_URL)
  throw new Error("Configure DATABASE_URL before seeding exercises.")
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
try {
  await client.connect()
  await client.query("BEGIN")
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtextextended('leo:exercise-seed:v1',0))"
  )
  const languages = (await client.query("SELECT id,code FROM languages")).rows
  for (const code of ["en", "uk", "nb", "de", "pl"])
    if (!languages.some((l) => l.code === code))
      throw new Error("Missing language")
  let created = 0,
    existing = 0,
    translations = 0
  for (const seed of seeds) {
    const found = await client.query(
      "SELECT id FROM exercises WHERE lower(btrim(name))=ANY($1::text[]) ORDER BY id LIMIT 1",
      [seed.aliases.map((s) => s.toLowerCase())]
    )
    let id = found.rows[0]?.id
    if (!id) {
      id = (
        await client.query(
          "INSERT INTO exercises(name,description,type,includes_own_weight,includes_additional_weight) VALUES($1,$2,'repetitions',$3,$4) RETURNING id",
          [
            seed.name,
            seed.translations.en[1],
            seed.ownWeight,
            seed.additionalWeight,
          ]
        )
      ).rows[0].id
      created++
    } else existing++
    for (const [code, [title, description]] of Object.entries(
      seed.translations
    )) {
      const result = await client.query(
        "INSERT INTO exercise_translations(exercise_id,language_id,title,description) VALUES($1,$2,$3,$4) ON CONFLICT(exercise_id,language_id) DO NOTHING",
        [id, languages.find((l) => l.code === code).id, title, description]
      )
      translations += result.rowCount
    }
  }
  await client.query("COMMIT")
  console.log(
    `Exercise seed complete: ${created} created, ${existing} already present, ${translations} translations added. Existing content was preserved.`
  )
} catch {
  await client.query("ROLLBACK").catch(() => {})
  console.error(
    "Exercise seed failed. Check database access and apply the exercise schema migration first. Credentials omitted."
  )
  process.exitCode = 1
} finally {
  await client.end()
}
