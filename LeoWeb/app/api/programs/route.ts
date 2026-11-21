import { mutate } from "@/lib/programs/http"
export async function POST(request: Request) {
  return mutate(request)
}
