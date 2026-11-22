import type { ExerciseOption } from "@/components/programs/canvas-layout"
import type { ProgramWorkoutTemplate } from "./draft"
import { targetRange } from "./program-template"

/** Compact prescriptions; never fill actual workout results from planned targets. */
export function programDayPreview(
  program: ProgramWorkoutTemplate,
  dayId: string,
  catalog: ExerciseOption[],
  fallback: string
) {
  const lines: string[] = []
  for (const group of program.blocks.filter(
    (b) => b.kind === "group" && b.parentId === dayId
  )) {
    for (const exercise of program.blocks.filter(
      (b) => b.kind === "exercise" && b.parentId === group.id
    )) {
      const name =
        catalog.find((e) => e.id === exercise.exerciseId)?.name ||
        exercise.name ||
        fallback
      const sets = program.blocks.filter(
        (b) => b.kind === "set" && b.parentId === exercise.id
      )
      if (!sets.length) lines.push(name)
      for (const set of sets) {
        const count = targetRange(
          String(set.setCountMin ?? set.setCount ?? 1),
          String(set.setCount ?? 1)
        )
        const reps = targetRange(
          set.targetRepsMin || "",
          set.targetRepsMax || ""
        )
        const value = targetRange(set.valueMin || "", set.valueMax || "")
        const unit = set.valueUnit === "percent_1rm" ? "%" : set.valueUnit || ""
        const prescription = [
          reps ? `${count}×${reps}` : `×${count}`,
          value ? `${value}${unit === "%" ? "" : " "}${unit}`.trim() : "",
        ]
          .filter(Boolean)
          .join(" · ")
        lines.push(
          `${name} ${prescription}${group.repeatCount > 1 ? ` · ×${group.repeatCount}` : ""}`
        )
      }
    }
  }
  return lines
}
