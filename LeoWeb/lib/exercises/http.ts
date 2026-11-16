import { currentUser, requireSameOrigin } from "@/lib/auth/session"
import { exerciseInput, saveExercise } from "@/lib/exercises/store"
export async function mutate(request: Request, id?: string) {
  try {
    if (!requireSameOrigin(request))
      return Response.json(
        { error: "Invalid request origin." },
        { status: 403 }
      )
    if (!(await currentUser()))
      return Response.json(
        { error: "Please sign in again before saving." },
        { status: 401 }
      )
    const reader = request.body?.getReader()
    if (!reader)
      return Response.json({ error: "Missing data." }, { status: 400 })
    let size = 0
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > 512000) {
        await reader.cancel()
        return Response.json(
          { error: "Exercise is too large." },
          { status: 413 }
        )
      }
      chunks.push(value)
    }
    const parsed = exerciseInput.safeParse(
      JSON.parse(Buffer.concat(chunks).toString("utf8"))
    )
    if (!parsed.success)
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid exercise." },
        { status: 400 }
      )
    const saved = await saveExercise(parsed.data, id)
    return saved
      ? Response.json(
          { id: saved },
          { headers: { "Cache-Control": "no-store" } }
        )
      : Response.json({ error: "Exercise no longer exists." }, { status: 404 })
  } catch (error) {
    if (error instanceof SyntaxError)
      return Response.json({ error: "Invalid data." }, { status: 400 })
    if (
      ((error as { code?: string; cause?: { code?: string } }).code ??
        (error as { cause?: { code?: string } }).cause?.code) === "23503"
    )
      return Response.json(
        { error: "A selected language no longer exists." },
        { status: 409 }
      )
    console.error("Exercise save failed.")
    return Response.json(
      { error: "Unable to save exercise. Please try again." },
      { status: 500 }
    )
  }
}
