// Presentation-only fixtures. No database IDs or persistence behavior.
export const muscleGroups = [
  "chest",
  "back",
  "legs",
  "shoulders",
  "core",
] as const
export type MuscleGroup = (typeof muscleGroups)[number]
export const sampleExercises = [
  { id: "squat", muscle: "legs", equipment: "barbell" },
  { id: "bench", muscle: "chest", equipment: "barbell" },
  { id: "deadlift", muscle: "legs", equipment: "barbell" },
  { id: "row", muscle: "back", equipment: "dumbbells" },
  { id: "press", muscle: "shoulders", equipment: "barbell" },
  { id: "pulldown", muscle: "back", equipment: "machine" },
  { id: "pushup", muscle: "chest", equipment: "bodyweight" },
  { id: "plank", muscle: "core", equipment: "bodyweight" },
] as const
