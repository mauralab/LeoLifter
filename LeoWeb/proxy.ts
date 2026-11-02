import { NextRequest, NextResponse } from "next/server"

// Keep local auth on one host: localhost and 127.0.0.1 have separate cookies.
// Redirect navigations only; POST origin checks remain strict.
export function proxy(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD")
    return NextResponse.next()
  const configured = process.env.APP_ORIGIN
  if (!configured) return NextResponse.next()
  let origin: URL
  try {
    origin = new URL(configured)
  } catch {
    return NextResponse.next()
  }
  const local = ["localhost", "127.0.0.1", "[::1]"]
  const url = new URL(request.url)
  // NextURL normalizes loopback IPs to localhost; use the incoming host explicitly.
  url.host = request.headers.get("host") ?? url.host
  if (
    origin.protocol === "http:" &&
    url.protocol === origin.protocol &&
    local.includes(origin.hostname) &&
    local.includes(url.hostname) &&
    origin.port === url.port &&
    origin.hostname !== url.hostname
  ) {
    const target = new URL(url.pathname + url.search, origin)
    const response = NextResponse.redirect(target, 307)
    response.headers.set("Cache-Control", "private, no-store")
    response.headers.set("Referrer-Policy", "strict-origin")
    return response
  }
  return NextResponse.next()
}
export const config = {
  matcher: [
    "/",
    "/en/:path*",
    "/uk/:path*",
    "/nb/:path*",
    "/de/:path*",
    "/pl/:path*",
    "/api/auth/:path*",
  ],
}
