import { NextResponse } from "next/server"
import {
  currentUser,
  requireSameOrigin,
  clearSessionCookies,
} from "@/lib/auth/session"
import { readAuthForm } from "@/lib/auth/http"
import { AuthError } from "@/lib/auth/errors"
import { changeProfile, ProfileError } from "@/lib/profile/store"
export const runtime = "nodejs"
function json(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  })
}
export async function POST(request: Request) {
  try {
    if (!requireSameOrigin(request)) return json({ error: "forbidden" }, 403)
    const identity = await currentUser()
    if (!identity) return json({ error: "unauthorized" }, 401)
    const form = await readAuthForm(request)
    const names = Array.from(form.keys())
    if (new Set(names).size !== names.length)
      return json({ error: "invalid" }, 400)
    const result = await changeProfile(identity, form)
    const response = json({ ok: true, ...result })
    if (result.signedOut) clearSessionCookies(response)
    return response
  } catch (error) {
    if (error instanceof ProfileError)
      return json(
        { error: error.code, fields: error.fields },
        error.code === "unauthorized"
          ? 401
          : error.code === "rateLimited"
            ? 429
            : 400
      )
    if (error instanceof AuthError) return json({ error: "invalid" }, 400)
    console.error(
      "Profile operation failed; check database connectivity and configuration."
    )
    return json({ error: "unavailable" }, 503)
  }
}
