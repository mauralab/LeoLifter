import { NextResponse } from "next/server"
import { AuthError } from "./errors"
import { appOrigin } from "./session"
import {
  LOGIN_COOKIE,
  APPROVAL_SECONDS,
  PasswordLoginError,
} from "./password-login"
export function loginJson(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  })
}
export function loginCookie(response: NextResponse, value: string) {
  response.cookies.set(LOGIN_COOKIE, value, {
    httpOnly: true,
    sameSite: "strict",
    secure: appOrigin().startsWith("https:"),
    path: "/api/auth/password",
    maxAge: value ? APPROVAL_SECONDS : 0,
  })
}
export function loginError(error: unknown) {
  if (error instanceof PasswordLoginError)
    return loginJson(
      { error: error.code },
      error.code === "rateLimited" ? 429 : 400
    )
  if (error instanceof AuthError)
    return loginJson({ error: "invalidCredentials" }, 400)
  console.error(
    "Password sign-in failed; check database connectivity and auth migrations."
  )
  return loginJson({ error: "unavailable" }, 503)
}
