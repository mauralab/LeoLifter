import { workoutRequest } from "@/lib/workouts/http"
export const dynamic = "force-dynamic"
export async function GET(request: Request) {
  return workoutRequest(request)
}
export async function POST(request: Request) {
  return workoutRequest(request)
}
