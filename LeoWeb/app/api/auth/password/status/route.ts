import { NextRequest } from "next/server"
import { readAuthForm } from "@/lib/auth/http"
import {
  requireSameOrigin,
  setSessionCookies,
  validateAuthConfiguration,
} from "@/lib/auth/session"
import { passwordLoginStatus, LOGIN_COOKIE } from "@/lib/auth/password-login"
import { loginCookie, loginError, loginJson } from "@/lib/auth/password-http"
export const runtime = "nodejs"
export async function POST(request: NextRequest) {
  try {
    validateAuthConfiguration()
    if (!requireSameOrigin(request))
      return loginJson({ error: "forbidden" }, 403)
    const form = await readAuthForm(request)
    if (
      Array.from(form.keys()).some((key) => key !== "action") ||
      form.getAll("action").length > 1 ||
      ![null, "status", "cancel"].includes(form.get("action") as string | null)
    )
      return loginJson({ error: "invalidCredentials" }, 400)
    const result = await passwordLoginStatus(
      request.cookies.get(LOGIN_COOKIE)?.value,
      form.get("action") === "cancel"
    )
    const response = loginJson({
      status: result.status,
      ...("reference" in result
        ? { reference: result.reference, expiresAt: result.expiresAt }
        : {}),
    })
    if (result.status === "signedIn")
      await setSessionCookies(response, result.session)
    if (result.status !== "pending") loginCookie(response, "")
    return response
  } catch (error) {
    return loginError(error)
  }
}
