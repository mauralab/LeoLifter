import { isLocale } from "@/lib/i18n"
import { NextRequest, NextResponse } from "next/server"
import { rotateRefreshToken } from "@/lib/auth/store"
import { AuthError } from "@/lib/auth/errors"
import {
  REFRESH_COOKIE,
  appOrigin,
  clearSessionCookies,
  privateRedirect,
  requireSameOrigin,
  setSessionCookies,
  validateAuthConfiguration,
} from "@/lib/auth/session"
import { authFailure, readAuthForm, requestLocale } from "@/lib/auth/http"

export const runtime = "nodejs"
// A direct visit starts the browser hand-off; GET never rotates a token.
export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale")
  return privateRedirect(
    `/${locale && isLocale(locale) ? locale : "en"}/profile`
  )
}
export async function POST(request: NextRequest) {
  let locale = "en"
  try {
    validateAuthConfiguration()
    if (!requireSameOrigin(request))
      return new NextResponse(null, { status: 403 })
    locale = requestLocale(await readAuthForm(request))
    const token = request.cookies.get(REFRESH_COOKIE)?.value
    if (!token) throw new AuthError("Please sign in through the bot.")
    const session = await rotateRefreshToken(token)
    const response = privateRedirect(`/${locale}/profile`)
    await setSessionCookies(response, session)
    return response
  } catch (error) {
    try {
      appOrigin()
    } catch {
      return new NextResponse("Sign-in is not configured.", { status: 503 })
    }
    const response =
      error instanceof AuthError
        ? privateRedirect(`/${locale}/login`)
        : authFailure(error, locale)
    if (error instanceof AuthError) clearSessionCookies(response)
    return response
  }
}
