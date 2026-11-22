import type { ExerciseOption } from "@/components/programs/canvas-layout"
import type {
  ProgramWorkoutTemplate,
  WorkoutGroup,
  WorkoutExercise,
  WorkoutSet,
} from "./draft"
export function programDayChoices(
  program: ProgramWorkoutTemplate,
  dayLabel: string
) {
  const result: { id: string; label: string }[] = [],
    visited = new Set<string>()
  function cycle(id: string, path: string[]) {
    if (visited.has(id)) return
    visited.add(id)
    const parent = program.blocks.find((b) => b.id === id)
    if (!parent) return
    const next = [...path, parent.name].filter(Boolean)
    program.blocks
      .filter((b) => b.kind === "day" && b.parentId === id)
      .forEach((day, i) =>
        result.push({
          id: day.id,
          label: [...next, day.name || `${dayLabel} ${i + 1}`].join(" / "),
        })
      )
    program.blocks
      .filter((b) => b.kind === "cycle" && b.parentId === id)
      .forEach((b) => cycle(b.id, next))
  }
  program.blocks
    .filter((b) => b.kind === "cycle" && !b.parentId)
    .forEach((b) => cycle(b.id, []))
  return result
}
export function workoutFromProgram(
  program: ProgramWorkoutTemplate,
  dayId: string,
  catalog: ExerciseOption[],
  includeOptional: boolean,
  dayLabel: string
) {
  const day = program.blocks.find((b) => b.id === dayId && b.kind === "day")
  if (!day || !program.dayIds[dayId])
    throw new Error("Program day no longer exists.")
  const groups: WorkoutGroup[] = [],
    exercises: WorkoutExercise[] = []
  for (const sourceGroup of program.blocks.filter(
    (b) => b.kind === "group" && b.parentId === dayId
  )) {
    const group = {
      id: crypto.randomUUID(),
      name: sourceGroup.name,
      repeatCount: sourceGroup.repeatCount,
    }
    groups.push(group)
    for (const block of program.blocks.filter(
      (b) => b.kind === "exercise" && b.parentId === sourceGroup.id
    )) {
      const exercise: WorkoutExercise = {
        id: crypto.randomUUID(),
        groupId: group.id,
        exerciseId: block.exerciseId,
        sets: [],
      }
      const type = catalog.find((e) => e.id === block.exerciseId)?.type
      const defaultUnit =
        type === "distance" ? "km" : type === "duration" ? "s" : "rep"
      const targets = program.blocks.filter(
        (b) => b.kind === "set" && b.parentId === block.id
      )
      for (const target of targets) {
        const max = target.setCount ?? 1,
          min = target.setCountMin ?? max,
          count = includeOptional ? max : min,
          batchId = crypto.randomUUID()
        for (let i = 0; i < count; i++)
          exercise.sets.push({
            id: crypto.randomUUID(),
            batchId,
            value: "",
            unit:
              type === "distance" &&
              ["km", "mi"].includes(target.valueUnit ?? "")
                ? target.valueUnit!
                : defaultUnit,
            weight: "",
            weightUnit: target.valueUnit === "lb" ? "lb" : "kg",
            seconds: "",
            rir: "",
            optional: i >= min,
            target: {
              repsMin: target.targetRepsMin ?? "",
              repsMax: target.targetRepsMax ?? "",
              valueMin: target.valueMin ?? "",
              valueMax: target.valueMax ?? "",
              unit: target.valueUnit ?? "",
              setsMin: min,
              setsMax: max,
            },
          })
      }
      if (!targets.length) {
        const id = crypto.randomUUID()
        exercise.sets.push({
          id,
          batchId: id,
          value: "",
          unit: defaultUnit,
          weight: "",
          weightUnit: "kg",
          seconds: "",
          rir: "",
        })
      }
      exercises.push(exercise)
    }
  }
  return {
    groups,
    exercises,
    source: {
      programId: program.id,
      programName: program.name,
      dayId: program.dayIds[dayId],
      dayName:
        programDayChoices(program, dayLabel).find((d) => d.id === dayId)
          ?.label ||
        day.name ||
        dayLabel,
    },
  }
}
export function targetRange(min: string, max: string) {
  return min && max ? (min === max ? min : `${min}–${max}`) : min || max
}
export function workoutTargetLabel(
  set: WorkoutSet,
  repsLabel: string,
  setsLabel: string
) {
  const target = set.target
  if (!target) return ""
  return [
    target.repsMin
      ? `${targetRange(target.repsMin, target.repsMax)} ${repsLabel}`
      : "",
    target.valueMin
      ? `${targetRange(target.valueMin, target.valueMax)} ${target.unit === "percent_1rm" ? "% 1RM" : target.unit}`
      : "",
    `${setsLabel}: ${targetRange(String(target.setsMin), String(target.setsMax))}`,
  ]
    .filter(Boolean)
    .join(" · ")
}
