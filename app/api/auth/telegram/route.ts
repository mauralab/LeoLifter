import { NextResponse } from "next/server"
import { signInTelegram } from "@/lib/auth/store"
import { telegramFields, verifyTelegramLink } from "@/lib/auth/telegram-link"
import {
  appOrigin,
  privateRedirect,
  requireSameOrigin,
  setSessionCookies,
  validateAuthConfiguration,
} from "@/lib/auth/session"
import { authFailure, readAuthForm, requestLocale } from "@/lib/auth/http"

export const runtime = "nodejs"
export async function POST(request: Request) {
  let locale = "en"
  try {
    validateAuthConfiguration()
    if (!requireSameOrigin(request))
      return new NextResponse(null, { status: 403 })
    if (Number(request.headers.get("content-length") ?? 0) > 8192)
      return new NextResponse(null, { status: 413 })
    const form = await readAuthForm(request)
    locale = requestLocale(form)
    const input = Object.fromEntries(
      telegramFields.map((key) => [
        key,
        form.getAll(key).length === 1 ? form.get(key) : null,
      ])
    )
    const link = verifyTelegramLink(input)
    const session = await signInTelegram(link, locale)
    const response = privateRedirect(`/${locale}/profile`)
    await setSessionCookies(response, session)
    return response
  } catch (error) {
    // Without a trusted origin configured, do not construct a redirect from a request-controlled Host header.
    try {
      appOrigin()
    } catch {
      return new NextResponse("Sign-in is not configured.", { status: 503 })
    }
    return authFailure(error, locale)
  }
}
