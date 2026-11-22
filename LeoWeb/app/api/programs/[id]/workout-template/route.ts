import { currentUser } from "@/lib/auth/session"
import { loadProgramForWorkout, ProgramError } from "@/lib/programs/store"
export const dynamic = "force-dynamic"
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headers = { "Cache-Control": "private, no-store" }
  try {
    const user = await currentUser()
    if (!user)
      return Response.json(
        { error: "Sign in to choose a program." },
        { status: 401, headers }
      )
    const { id } = await params
    if (
      !/^[1-9]\d{0,18}$/.test(id) ||
      BigInt(id) > BigInt("9223372036854775807")
    )
      return Response.json(
        { error: "Program not found." },
        { status: 404, headers }
      )
    return Response.json(await loadProgramForWorkout(id, user.userId), {
      headers,
    })
  } catch (e) {
    if (e instanceof ProgramError)
      return Response.json({ error: e.message }, { status: e.status, headers })
    console.error(
      "Workout template load failed. " +
        JSON.stringify({
          name: e instanceof Error ? e.name : "UnknownError",
          message:
            e instanceof Error
              ? e.message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[database]")
              : "Unknown error",
        })
    )
    return Response.json(
      { error: "Unable to load program." },
      { status: 500, headers }
    )
  }
}
