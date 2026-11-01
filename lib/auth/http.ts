import { AuthError, AuthConfigurationError } from "./errors"
import { privateRedirect } from "./session"
import { isLocale } from "@/lib/i18n"

export function requestLocale(form: FormData) {
  const locale = form.get("locale")
  return typeof locale === "string" && isLocale(locale) ? locale : "en"
}
export function authFailure(error: unknown, locale: string) {
  const expected = error instanceof AuthError
  if (!expected)
    console.error(
      error instanceof AuthConfigurationError
        ? "Auth configuration is missing or invalid."
        : "Auth database operation failed; check connectivity and migrations."
    )
  return privateRedirect(
    `/${locale}/auth/error?reason=${expected ? "invalid" : "unavailable"}`
  )
}

/** Bound auth inputs before buffering; these endpoints accept native URL-encoded forms only. */
export async function readAuthForm(request: Request): Promise<FormData> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/x-www-form-urlencoded"
  )
    throw new AuthError("Invalid sign-in request.")
  const reader = request.body?.getReader()
  if (!reader) throw new AuthError("Invalid sign-in request.")
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > 8192) {
      await reader.cancel()
      throw new AuthError("Invalid sign-in request.")
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  let text: string
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    throw new AuthError("Invalid sign-in request.")
  }
  const form = new FormData()
  new URLSearchParams(text).forEach((value, key) => form.append(key, value))
  return form
}
