import { mutate } from "@/lib/exercises/http"
export async function POST(request: Request) {
  return mutate(request)
}
