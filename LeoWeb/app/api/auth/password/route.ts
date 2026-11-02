import { NextRequest } from "next/server"
import { readAuthForm, requestLocale } from "@/lib/auth/http"
import {
  requireSameOrigin,
  validateAuthConfiguration,
} from "@/lib/auth/session"
import { beginPasswordLogin, LOGIN_COOKIE } from "@/lib/auth/password-login"
import { loginCookie, loginError, loginJson } from "@/lib/auth/password-http"
export const runtime = "nodejs"
export async function POST(request: NextRequest) {
  try {
    validateAuthConfiguration()
    if (!requireSameOrigin(request))
      return loginJson({ error: "forbidden" }, 403)
    const form = await readAuthForm(request)
    const keys = Array.from(form.keys())
    if (new Set(keys).size !== keys.length)
      return loginJson({ error: "invalidCredentials" }, 400)
    const nickname = form.get("nickname"),
      password = form.get("password")
    if (typeof nickname !== "string" || typeof password !== "string")
      return loginJson({ error: "invalidCredentials" }, 400)
    const challenge = await beginPasswordLogin(
      nickname,
      password,
      requestLocale(form),
      request.headers.get("user-agent") ?? "",
      request.cookies.get(LOGIN_COOKIE)?.value
    )
    const response = loginJson({
      status: "pending",
      reference: challenge.reference,
      expiresAt: challenge.expiresAt,
    })
    loginCookie(response, challenge.cookie)
    return response
  } catch (error) {
    return loginError(error)
  }
}
