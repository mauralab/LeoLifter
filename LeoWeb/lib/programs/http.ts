import { currentUser, requireSameOrigin } from "@/lib/auth/session"
import { programInput } from "./validation"
import { ProgramError, saveProgram } from "./store"
export async function mutate(request: Request, id?: string) {
  try {
    if (!requireSameOrigin(request))
      return Response.json(
        { error: "Invalid request origin." },
        { status: 403 }
      )
    const user = await currentUser()
    if (!user)
      return Response.json(
        { error: "Please sign in again before saving." },
        { status: 401 }
      )
    if (
      id &&
      (!/^[1-9]\d{0,18}$/.test(id) ||
        BigInt(id) > BigInt("9223372036854775807"))
    )
      return Response.json({ error: "Program not found." }, { status: 404 })
    const reader = request.body?.getReader()
    if (!reader) throw new ProgramError("Missing data.")
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > 2000000) {
        await reader.cancel()
        throw new ProgramError("Program is too large.", 413)
      }
      chunks.push(value)
    }
    const result = programInput.safeParse(
      JSON.parse(Buffer.concat(chunks).toString("utf8"))
    )
    if (!result.success)
      throw new ProgramError(
        result.error.issues[0]?.message ?? "Invalid program."
      )
    const saved = await saveProgram(result.data, user.userId, id)
    return Response.json(saved, {
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch (error) {
    if (error instanceof ProgramError)
      return Response.json({ error: error.message }, { status: error.status })
    if (error instanceof SyntaxError)
      return Response.json({ error: "Invalid data." }, { status: 400 })
    if ((error as { code?: string }).code === "23503")
      return Response.json(
        {
          error:
            "An exercise was removed. Choose another exercise and try again.",
        },
        { status: 409 }
      )
    console.error("Program save failed.")
    return Response.json(
      { error: "Unable to save program. Please try again." },
      { status: 500 }
    )
  }
}
