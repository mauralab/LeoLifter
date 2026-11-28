import { currentUser, requireSameOrigin } from "@/lib/auth/session"
import { z } from "zod"
import { databaseId, workoutInput } from "./validation"
import { loadWorkout, listWorkouts, saveWorkout, deleteWorkout, WorkoutError } from "./store"
const headers = { "Cache-Control": "private, no-store" }
export async function workoutRequest(request: Request, id?: string) {
  try {
    if (request.method !== "GET" && !requireSameOrigin(request))
      return Response.json(
        { error: "Invalid request origin." },
        { status: 403, headers }
      )
    const user = await currentUser()
    if (!user)
      return Response.json(
        { error: "Sign in to view or save workouts." },
        { status: 401, headers }
      )
    if (id && !databaseId.safeParse(id).success)
      throw new WorkoutError("Workout not found.", 404)
    if (request.method === "GET") {
      if (id)
        return Response.json(await loadWorkout(id, user.userId), { headers })
      const url = new URL(request.url),
        page = Number(url.searchParams.get("page") || 1),
        query = (url.searchParams.get("q") || "").slice(0, 200)
      if (!Number.isSafeInteger(page) || page < 1)
        throw new WorkoutError("Invalid page.")
      const month = url.searchParams.get("month") || undefined
      if (
        month &&
        (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(month) || month.startsWith("0000"))
      )
        throw new WorkoutError("Invalid month.")
      return Response.json(
        await listWorkouts(user.userId, query, page, month),
        {
          headers,
        }
      )
    }
    if (request.method === "DELETE" && id) {
      const revision = z.uuid().safeParse(request.headers.get("if-match"))
      if (!revision.success) throw new WorkoutError("Reopen the workout before deleting.",409)
      await deleteWorkout(id,user.userId,revision.data)
      return Response.json({ ok:true },{headers})
    }
    const reader = request.body?.getReader()
    if (!reader) throw new WorkoutError("Missing data.")
    let size = 0
    const chunks: Uint8Array[] = []
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.length
      if (size > 2000000) {
        await reader.cancel()
        throw new WorkoutError("Workout is too large.", 413)
      }
      chunks.push(value)
    }
    const parsed = workoutInput.safeParse(
      JSON.parse(Buffer.concat(chunks).toString("utf8"))
    )
    if (!parsed.success)
      throw new WorkoutError(
        parsed.error.issues[0]?.message || "Invalid workout."
      )
    return Response.json(await saveWorkout(parsed.data, user.userId, id), {
      headers,
    })
  } catch (e) {
    if (e instanceof WorkoutError)
      return Response.json({ error: e.message }, { status: e.status, headers })
    if (e instanceof SyntaxError)
      return Response.json({ error: "Invalid data." }, { status: 400, headers })
    if ((e as { code?: string }).code === "23503")
      return Response.json(
        { error: "A referenced item is no longer available." },
        { status: 409, headers }
      )
    console.error(
      "Workout request failed: " +
        (e instanceof Error ? e.name : "UnknownError")
    )
    return Response.json(
      { error: "Unable to load or save workouts. Please try again." },
      { status: 500, headers }
    )
  }
}
