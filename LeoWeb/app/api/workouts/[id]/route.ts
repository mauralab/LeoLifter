import { workoutRequest } from "@/lib/workouts/http"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }
export async function GET(request: Request, { params }: Context) {
  return workoutRequest(request, (await params).id)
}
export async function PUT(request: Request, { params }: Context) {
  return workoutRequest(request, (await params).id)
}

export async function DELETE(request: Request, { params }: Context) {
  return workoutRequest(request, (await params).id)
}
