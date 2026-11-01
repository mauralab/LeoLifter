import { NextRequest, NextResponse } from "next/server"
import { revokeRefreshToken } from "@/lib/auth/store"
import {
  REFRESH_COOKIE,
  clearSessionCookies,
  privateRedirect,
  requireSameOrigin,
  validateAuthConfiguration,
} from "@/lib/auth/session"
import { requestLocale, readAuthForm } from "@/lib/auth/http"

export const runtime = "nodejs"
export async function POST(request: NextRequest) {
  try {
    validateAuthConfiguration()
    if (!requireSameOrigin(request))
      return new NextResponse(null, { status: 403 })
    const locale = requestLocale(await readAuthForm(request))
    const token = request.cookies.get(REFRESH_COOKIE)?.value
    if (token) await revokeRefreshToken(token)
    const response = privateRedirect(`/${locale}`)
    clearSessionCookies(response)
    return response
  } catch {
    return new NextResponse("Sign-out is temporarily unavailable.", {
      status: 503,
    })
  }
}
