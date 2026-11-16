import "server-only"
import { eq, asc } from "drizzle-orm"
import { z } from "zod"
import { getDb } from "@/lib/db"
import {
  exercises,
  exerciseTranslations,
  exerciseMedia,
  exerciseMediaTranslations,
  languages,
} from "@/lib/db/schema"
const id = z
  .string()
  .regex(/^[1-9][0-9]{0,18}$/)
  .refine((v) => BigInt(v) <= BigInt("9223372036854775807"))
const short = z.string().trim().max(200)
const description = z.string().trim().max(10000)
const url = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => {
    try {
      const u = new URL(v)
      return (
        ["https:", "http:"].includes(u.protocol) && !u.username && !u.password
      )
    } catch {
      return /^\/api\/exercises\/files\/[a-f0-9-]+\.(png|jpg|webp|mp4|webm)$/.test(
        v
      )
    }
  }, "Enter an HTTP(S) media URL.")
export const exerciseInput = z
  .object({
    name: short.min(1),
    description,
    type: z.enum(["repetitions", "distance", "duration"]),
    includesOwnWeight: z.boolean(),
    includesAdditionalWeight: z.boolean(),
    translations: z
      .array(z.object({ languageId: id, title: short.min(1), description }))
      .max(100),
    media: z
      .array(
        z.object({
          type: z.enum(["image", "video"]),
          translations: z
            .array(
              z.object({
                languageId: id,
                url,
                title: short,
                description,
                altText: short,
              })
            )
            .min(1)
            .max(100),
        })
      )
      .max(30),
  })
  .superRefine((v, c) => {
    for (const list of [
      v.translations,
      ...v.media.map((m) => m.translations),
    ]) {
      if (new Set(list.map((t) => t.languageId)).size !== list.length)
        c.addIssue({
          code: "custom",
          message: "Duplicate translation language.",
        })
    }
  })
export const validId = (v: string) => id.safeParse(v).success
export async function languageList() {
  return (
    await getDb().select().from(languages).orderBy(asc(languages.id))
  ).map((l) => ({ ...l, id: String(l.id) }))
}
export async function exerciseList() {
  const db = getDb()
  const [rows, texts, media, mediaTexts] = await Promise.all([
    db.select().from(exercises).orderBy(asc(exercises.id)),
    db.select().from(exerciseTranslations),
    db.select().from(exerciseMedia).orderBy(asc(exerciseMedia.position)),
    db.select().from(exerciseMediaTranslations),
  ])
  return rows.map((e) => ({
    ...e,
    id: String(e.id),
    description: e.description ?? "",
    translations: texts
      .filter((t) => t.exerciseId === e.id)
      .map((t) => ({
        languageId: String(t.languageId),
        title: t.title,
        description: t.description ?? "",
      })),
    media: media
      .filter((m) => m.exerciseId === e.id)
      .map((m) => ({
        type: m.type,
        translations: mediaTexts
          .filter((t) => t.exerciseMediaId === m.id)
          .map((t) => ({
            languageId: String(t.languageId),
            url: t.url,
            title: t.title ?? "",
            description: t.description ?? "",
            altText: t.altText ?? "",
          })),
      })),
  }))
}
export async function saveExercise(
  value: z.infer<typeof exerciseInput>,
  exerciseId?: string
) {
  return getDb().transaction(async (tx) => {
    let key: bigint
    if (exerciseId) {
      const [row] = await tx
        .select()
        .from(exercises)
        .where(eq(exercises.id, BigInt(exerciseId)))
        .for("update")
      if (!row) return null
      key = row.id
    } else {
      const [row] = await tx
        .insert(exercises)
        .values({ name: value.name, type: value.type })
        .returning()
      key = row.id
    }
    await tx
      .update(exercises)
      .set({
        name: value.name,
        description: value.description || null,
        type: value.type,
        includesOwnWeight: value.includesOwnWeight,
        includesAdditionalWeight: value.includesAdditionalWeight,
      })
      .where(eq(exercises.id, key))
    await tx
      .delete(exerciseTranslations)
      .where(eq(exerciseTranslations.exerciseId, key))
    if (value.translations.length)
      await tx
        .insert(exerciseTranslations)
        .values(
          value.translations.map((t) => ({
            ...t,
            exerciseId: key,
            languageId: BigInt(t.languageId),
          }))
        )
    await tx.delete(exerciseMedia).where(eq(exerciseMedia.exerciseId, key))
    for (const [i, m] of value.media.entries()) {
      const [row] = await tx
        .insert(exerciseMedia)
        .values({ exerciseId: key, type: m.type, position: i + 1 })
        .returning()
      await tx
        .insert(exerciseMediaTranslations)
        .values(
          m.translations.map((t) => ({
            ...t,
            exerciseMediaId: row.id,
            languageId: BigInt(t.languageId),
          }))
        )
    }
    return String(key)
  })
}
export async function deleteExercise(id: string) {
  return (
    (
      await getDb()
        .delete(exercises)
        .where(eq(exercises.id, BigInt(id)))
        .returning()
    ).length > 0
  )
}
