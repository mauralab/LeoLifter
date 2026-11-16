import { currentUser, requireSameOrigin } from "@/lib/auth/session"
import { deleteExercise, validId } from "@/lib/exercises/store"
import { mutate } from "@/lib/exercises/http"
type Context = { params: Promise<{ id: string }> }
export async function PUT(request: Request, context: Context) {
  const { id } = await context.params
  return validId(id)
    ? mutate(request, id)
    : Response.json({ error: "Invalid exercise ID." }, { status: 400 })
}
export async function DELETE(request: Request, context: Context) {
  try {
    if (!requireSameOrigin(request))
      return Response.json(
        { error: "Invalid request origin." },
        { status: 403 }
      )
    if (!(await currentUser()))
      return Response.json({ error: "Please sign in again." }, { status: 401 })
    const { id } = await context.params
    if (!validId(id))
      return Response.json({ error: "Invalid exercise ID." }, { status: 400 })
    return (await deleteExercise(id))
      ? Response.json({ ok: true })
      : Response.json({ error: "Exercise no longer exists." }, { status: 404 })
  } catch (error) {
    if (
      ["23503", "23001"].includes(
        (error as { code?: string; cause?: { code?: string } }).code ??
          (error as { cause?: { code?: string } }).cause?.code ??
          ""
      )
    )
      return Response.json(
        {
          error:
            "This exercise is used in a program or workout and cannot be deleted.",
        },
        { status: 409 }
      )
    return Response.json(
      { error: "Unable to delete exercise." },
      { status: 500 }
    )
  }
}
