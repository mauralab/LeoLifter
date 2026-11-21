import { mutate } from "@/lib/programs/http"
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return mutate(request, (await params).id)
}
