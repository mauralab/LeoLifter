import { z } from "zod"
import {
  parentKind,
  targetError,
  type CanvasBlock,
} from "@/components/programs/canvas-layout"

export const blockInput = z.object({
  id: z.string().min(1).max(100),
  kind: z.enum(["cycle", "day", "group", "exercise", "set"]),
  name: z.string().max(200),
  description: z.string().max(10000),
  repeatCount: z.number().int().min(1).max(2147483647),
  x: z.number().finite().min(0).max(1000000),
  y: z.number().finite().min(0).max(1000000),
  parentId: z.string().min(1).max(100).optional(),
  exerciseId: z
    .string()
    .regex(/^[1-9]\d{0,18}$/)
    .refine(
      (value) =>
        /^[1-9]\d{0,18}$/.test(value) &&
        BigInt(value) <= BigInt("9223372036854775807"),
      "Invalid exercise ID."
    )
    .optional(),
  setCountMin: z.number().int().min(0).max(100).optional(),
  setCount: z.number().int().min(1).max(100).optional(),
  targetRepsMin: z.string().max(20).optional(),
  targetRepsMax: z.string().max(20).optional(),
  valueMin: z.string().max(30).optional(),
  valueMax: z.string().max(30).optional(),
  valueUnit: z.string().max(30).optional(),
})
export const programDescriptionInput = z.object({
  languageId: z
    .string()
    .regex(/^[1-9]\d{0,18}$/)
    .refine(
      (v) =>
        /^[1-9]\d{0,18}$/.test(v) && BigInt(v) <= BigInt("9223372036854775807")
    ),
  description: z.string().max(20000),
  imageUrl: z
    .string()
    .max(2048)
    .refine(
      (v) =>
        v === "" ||
        /^\/api\/programs\/files\/[1-9]\d{0,18}\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(png|jpg|webp)$/.test(
          v
        ),
      "Upload a program image."
    ),
  imageAlt: z.string().max(300),
})
export const programDescriptionsInput = z
  .array(programDescriptionInput)
  .max(100)
  .refine(
    (rows) => new Set(rows.map((r) => r.languageId)).size === rows.length,
    "Duplicate description languages."
  )
export type ProgramDescription = z.infer<typeof programDescriptionInput>
export const programInput = z
  .object({
    name: z.string().trim().min(1, "Enter a program name.").max(200),
    revision: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    blocks: z.array(blockInput).max(1000),
    descriptions: programDescriptionsInput.optional(),
  })
  .superRefine(({ blocks }, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message })
    const map = new Map(blocks.map((b) => [b.id, b]))
    if (map.size !== blocks.length) fail("Duplicate object IDs.")
    let total = 0
    for (const b of blocks) {
      const parent = b.parentId ? map.get(b.parentId) : undefined
      if (
        (b.parentId && !parent) ||
        (parent && parent.kind !== parentKind[b.kind]) ||
        (!parent && b.kind !== "cycle")
      )
        fail("Invalid program hierarchy.")
      const seen = new Set([b.id])
      let p = parent
      while (p) {
        if (seen.has(p.id)) {
          fail("Cycles cannot contain themselves.")
          break
        }
        seen.add(p.id)
        p = p.parentId ? map.get(p.parentId) : undefined
      }
      if (b.kind === "cycle" && !b.name.trim())
        fail("Every cycle needs a name.")
      if (b.kind === "exercise" && !b.exerciseId)
        fail("Choose an exercise for every exercise object.")
      if (b.kind === "set") {
        total += b.setCount ?? 1
        if ((b.setCountMin ?? b.setCount ?? 1) > (b.setCount ?? 1))
          fail("Minimum sets cannot exceed maximum sets.")
        if (targetError(b as CanvasBlock))
          fail("Complete valid set targets before saving.")
      }
    }
    if (total > 5000) fail("A program can contain at most 5,000 sets.")
  })
export type ProgramInput = z.infer<typeof programInput>
export type SavedProgram = {
  id: string
  name: string
  revision: string
  blocks: CanvasBlock[]
  descriptions: ProgramDescription[]
}
export type ProgramSummary = {
  id: string
  name: string
  description?: string | null
  imageUrl?: string | null
  imageAlt?: string | null
}
