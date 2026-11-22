import type { CanvasBlock } from "@/components/programs/canvas-layout"
export type WorkoutTarget = {
  repsMin: string
  repsMax: string
  valueMin: string
  valueMax: string
  unit: string
  setsMin: number
  setsMax: number
}
export type WorkoutSet = {
  id: string
  batchId: string
  value: string
  unit: string
  weight: string
  weightUnit: string
  seconds: string
  rir: string
  target?: WorkoutTarget
  optional?: boolean
}
export type WorkoutGroup = { id: string; name: string; repeatCount: number }
export type WorkoutExercise = {
  groupId: string
  id: string
  exerciseId?: string
  sets: WorkoutSet[]
}
export type ProgramWorkoutTemplate = {
  id: string
  name: string
  blocks: CanvasBlock[]
  dayIds: Record<string, string>
}
export type WorkoutSource = {
  programId: string
  programName: string
  dayId: string
  dayName: string
}
