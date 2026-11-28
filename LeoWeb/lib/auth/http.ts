import { AuthError, AuthConfigurationError } from "./errors"
import { privateRedirect } from "./session"
import { isLocale } from "@/lib/i18n"

export function requestLocale(form: FormData) {
  const locale = form.get("locale")
  return typeof locale === "string" && isLocale(locale) ? locale : "en"
}
export function authFailure(error: unknown, locale: string) {
  const expected = error instanceof AuthError
  if (!expected) {
    // Never log query text, parameters, credentials or complete exception messages.
    const cause = error instanceof Error ? error.cause : undefined
    const databaseCode = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : undefined
    console.error("Auth operation failed", {
      kind: error instanceof AuthConfigurationError ? "configuration" : error instanceof Error ? error.name : "unknown",
      databaseCode: databaseCode && /^[A-Z0-9]{5}$/.test(databaseCode) ? databaseCode : undefined,
      location: error instanceof Error ? error.stack?.split("\n").filter(line => line.trim().startsWith("at ")).slice(0, 3).join("\n") : undefined,
    })
  }
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
