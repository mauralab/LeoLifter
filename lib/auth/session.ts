import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { AuthConfigurationError, requiredSecret } from "./errors"
import { findSessionUser } from "./store"

export const ACCESS_COOKIE = "leo_access"
export const REFRESH_COOKIE = "leo_refresh"
export function appOrigin() {
  const configured = process.env.APP_ORIGIN
  try {
    const url = new URL(configured ?? "")
    if (
      url.origin !== configured ||
      (url.protocol !== "https:" &&
        !(
          url.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
        ))
    )
      throw new Error()
    return url.origin
  } catch {
    throw new AuthConfigurationError(
      "Configure APP_ORIGIN as an HTTPS origin (or HTTP localhost for development)."
    )
  }
}
export function validateAuthConfiguration() {
  appOrigin()
  requiredSecret("SESSION_SECRET")
}
export function requireSameOrigin(request: Request) {
  return request.headers.get("origin") === appOrigin()
}
const signingKey = () =>
  new TextEncoder().encode(requiredSecret("SESSION_SECRET"))
export async function setSessionCookies(
  response: NextResponse,
  session: {
    userId: string
    sessionId: string
    refreshToken: string
    expiresAt: Date
  }
) {
  const jwt = await new SignJWT({ sid: session.sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuer("leolifter")
    .setAudience("leolifter-web")
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(signingKey())
  const base = {
    httpOnly: true,
    secure: appOrigin().startsWith("https:"),
    sameSite: "lax" as const,
  }
  response.cookies.set(ACCESS_COOKIE, jwt, {
    ...base,
    path: "/",
    maxAge: 15 * 60,
  })
  response.cookies.set(REFRESH_COOKIE, session.refreshToken, {
    ...base,
    path: "/api/auth",
    expires: session.expiresAt,
  })
}
export function clearSessionCookies(response: NextResponse) {
  const base = {
    httpOnly: true,
    secure: appOrigin().startsWith("https:"),
    sameSite: "lax" as const,
    maxAge: 0,
  }
  response.cookies.set(ACCESS_COOKIE, "", { ...base, path: "/" })
  response.cookies.set(REFRESH_COOKIE, "", { ...base, path: "/api/auth" })
}
export async function currentUser() {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value
  if (!token) return null
  const key = signingKey()
  let userId: string, sessionId: string
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      issuer: "leolifter",
      audience: "leolifter-web",
    })
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string")
      return null
    userId = payload.sub
    sessionId = payload.sid
  } catch {
    return null
  }
  return findSessionUser(userId, sessionId)
}
export function privateRedirect(path: string) {
  const response = NextResponse.redirect(new URL(path, appOrigin()), 303)
  response.headers.set("Cache-Control", "private, no-store")
  response.headers.set("Referrer-Policy", "strict-origin")
  return response
}
