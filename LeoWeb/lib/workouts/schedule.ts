import { workoutDateTime } from "@/components/workouts/workout-defaults"

/** Convert the displayed wall-clock date in the profile/browser zone into an instant. */
export function workoutInstant(local: string, timeZone: string) {
  const wall = Date.parse(local + ":00Z")
  if (!Number.isFinite(wall)) throw new Error("Invalid date")
  let instant = wall
  for (let i = 0; i < 4; i++) {
    const displayed = workoutDateTime(new Date(instant).toISOString(), timeZone)
    const delta = wall - Date.parse(displayed + ":00Z")
    if (!delta) return new Date(instant).toISOString()
    instant += delta
  }
  throw new Error("This local time does not exist in the selected timezone")
}
