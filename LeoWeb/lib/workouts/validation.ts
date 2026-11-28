import { z } from "zod"
export const databaseId = z
  .string()
  .regex(/^[1-9]\d{0,18}$/)
  .refine(
    (v) =>
      /^[1-9]\d{0,18}$/.test(v) && BigInt(v) <= BigInt("9223372036854775807")
  )
const key = z.string().min(1).max(100)
const numberText = (max: number, places: number, whole = false) =>
  z
    .string()
    .max(30)
    .refine(
      (v) =>
        v === "" ||
        (/^\d+(?:\.\d+)?$/.test(v) &&
          Number(v) <= max &&
          (v.split(".")[1]?.length ?? 0) <= places &&
          (!whole || Number.isInteger(Number(v)))),
      "Invalid workout result."
    )
const value = numberText(999999999.999, 3)
const target = z.object({
  repsMin: z.string().max(30),
  repsMax: z.string().max(30),
  valueMin: z.string().max(30),
  valueMax: z.string().max(30),
  unit: z.string().max(30),
  setsMin: z.number().int().min(0).max(100),
  setsMax: z.number().int().min(1).max(100),
})
const row = z
  .object({
    id: key,
    batchId: key,
    value,
    unit: z.enum(["rep", "km", "mi", "s"]),
    weight: value,
    weightUnit: z.enum(["kg", "lb"]),
    seconds: value,
    rir: numberText(999.9, 1),
    target: target.optional(),
    optional: z.boolean().optional(),
  })
  .refine(
    (s) =>
      s.unit !== "rep" || s.value === "" || Number.isInteger(Number(s.value)),
    "Repetitions must be whole numbers."
  )
export const workoutInput = z
  .object({
    clientKey: z.uuid(),
    revision: z.uuid().optional(),
    title: z
      .string()
      .min(1)
      .max(200)
      .refine((v) => !!v.trim(), "Enter a workout title."),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
      .refine((v) => {
        const d = new Date(v + ":00Z")
        return (
          Number.isFinite(d.getTime()) && d.toISOString().slice(0, 16) === v
        )
      }, "Invalid date."),
    scheduledAt: z.iso.datetime(),
    notes: z.string().max(10000),
    source: z
      .object({
        programId: databaseId,
        programName: z.string().max(200),
        dayId: databaseId,
        dayName: z.string().max(1000),
      })
      .nullable(),
    groups: z
      .array(
        z.object({
          id: key,
          name: z.string().max(200),
          repeatCount: z.number().int().min(1).max(2147483647),
        })
      )
      .max(500),
    exercises: z
      .array(
        z.object({
          id: key,
          groupId: key,
          exerciseId: databaseId.optional(),
          sets: z.array(row).max(5000),
        })
      )
      .max(1000),
  })
  .superRefine((d, ctx) => {
    const ids = new Set<string>()
    let count = 0
    const add = (id: string) => {
      if (ids.has(id))
        ctx.addIssue({ code: "custom", message: "Duplicate item ID." })
      ids.add(id)
    }
    d.groups.forEach((g) => add(g.id))
    const groups = new Set(d.groups.map((g) => g.id))
    for (const e of d.exercises) {
      add(e.id)
      if (!groups.has(e.groupId))
        ctx.addIssue({ code: "custom", message: "Exercise group is missing." })
      for (const s of e.sets) {
        add(s.id)
        count++
      }
    }
    if (count > 5000)
      ctx.addIssue({ code: "custom", message: "Too many sets." })
  })
export type WorkoutInput = z.infer<typeof workoutInput>
export type SavedWorkout = {
  id: string
  revision: string
  draft: WorkoutInput
  updatedAt: string
}
