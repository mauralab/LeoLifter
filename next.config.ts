import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  logging: { incomingRequests: { ignore: [/\/auth(?:\/|\?|$)/] } },
  async headers() {
    return [
      {
        source: "/:locale/auth/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin" },
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
      {
        source: "/:locale/profile",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ]
  },
  async redirects() {
    return [{ source: "/", destination: "/en", permanent: false }]
  },
}
export default nextConfig
