import type { ExerciseOption } from "@/components/programs/canvas-layout"
import type { WorkoutExercise, WorkoutGroup, WorkoutSet } from "./draft"
export type WorkoutExportDraft = {
  username: string
  date: string
  title: string
  groups: WorkoutGroup[]
  exercises: WorkoutExercise[]
  catalog: ExerciseOption[]
}
const line = (s: string) => s.replace(/[\r\n\t]+/g, " ").trim()
export function exportDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  return match ? `${match[3]}.${match[2]}.${match[1]}` : "—"
}
function signature(s: WorkoutSet) {
  return JSON.stringify([
    s.value,
    s.unit,
    s.weight,
    s.weightUnit,
    s.seconds,
    s.rir,
  ])
}
function result(s: WorkoutSet, count: number) {
  const value = s.value.trim() || "—"
  const main = `${value}${s.unit === "rep" ? "" : ` ${s.unit}`}${count > 1 ? `×${count}` : ""}`
  return [
    main,
    s.weight.trim() ? `${s.weight.trim()}${s.weightUnit}` : "",
    s.seconds.trim() ? `${s.seconds.trim()}s` : "",
    s.rir.trim() ? `RIR ${s.rir.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" ")
}
export function exerciseResults(sets: WorkoutSet[]) {
  const runs: { set: WorkoutSet; count: number }[] = []
  for (const set of sets) {
    const last = runs.at(-1)
    if (last && signature(last.set) === signature(set)) last.count++
    else runs.push({ set, count: 1 })
  }
  return runs.map(({ set, count }) => result(set, count)).join(", ") || "—"
}
export function workoutText(draft: WorkoutExportDraft, exerciseLabel: string) {
  const lines = [
    `#${line(draft.username).replace(/^#+/, "") || "—"}`,
    exportDate(draft.date),
    "",
  ]
  for (const group of draft.groups) {
    if (group.repeatCount > 1)
      lines.push(`[${line(group.name)} ×${group.repeatCount}]`)
    for (const exercise of draft.exercises.filter(
      (e) => e.groupId === group.id
    )) {
      const name =
        draft.catalog.find((e) => e.id === exercise.exerciseId)?.name ||
        exerciseLabel
      lines.push(`${line(name)} ${exerciseResults(exercise.sets)}`)
    }
  }
  return lines.join("\n")
}
export async function workoutExcel(
  draft: WorkoutExportDraft,
  labels: {
    exercise: string
    group: string
    repeatCount: string
    set: string
    result: string
    weight: string
    timeSpent: string
    rir: string
    summary: string
  }
) {
  const { default: ExcelJS } = await import("exceljs")
  const book = new ExcelJS.Workbook()
  const summary = book.addWorksheet("Workout")
  summary.columns = [{ width: 40 }, { width: 90 }]
  summary.addRow([`#${line(draft.username).replace(/^#+/, "") || "—"}`])
  summary.addRow([exportDate(draft.date)])
  summary.addRow([draft.title])
  summary.addRow([labels.exercise, labels.summary])
  const detail = book.addWorksheet("Sets")
  detail.columns = [
    labels.group,
    labels.repeatCount,
    labels.exercise,
    labels.set,
    labels.result,
    labels.weight,
    labels.timeSpent,
    labels.rir,
  ].map((header) => ({ header, width: 24 }))
  for (const group of draft.groups)
    for (const exercise of draft.exercises.filter(
      (e) => e.groupId === group.id
    )) {
      const name =
        draft.catalog.find((e) => e.id === exercise.exerciseId)?.name ||
        labels.exercise
      summary.addRow([name, exerciseResults(exercise.sets)])
      exercise.sets.forEach((s, i) =>
        detail.addRow([
          group.name,
          group.repeatCount,
          name,
          i + 1,
          s.value.trim() ? `${s.value} ${s.unit}` : "",
          s.weight.trim() ? `${s.weight} ${s.weightUnit}` : "",
          s.seconds,
          s.rir,
        ])
      )
    }
  for (const sheet of [summary, detail]) {
    sheet.views = [{ state: "frozen", ySplit: sheet === summary ? 4 : 1 }]
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { vertical: "top", wrapText: true }
      })
    })
    const header = sheet.getRow(sheet === summary ? 4 : 1)
    header.font = { bold: true }
    header.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFD966" },
    }
  }
  return new Uint8Array(await book.xlsx.writeBuffer())
}
