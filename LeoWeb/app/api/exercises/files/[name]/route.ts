import { readFile } from "node:fs/promises"
import path from "node:path"
import { filePattern, mediaRoot, mime } from "@/lib/exercises/files"
export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params
  if (!filePattern.test(name)) return new Response(null, { status: 404 })
  try {
    const data = await readFile(path.join(mediaRoot(), name))
    const headers = {
      "Content-Type": mime[name.split(".").pop()!],
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
    }
    const range = request.headers.get("range")
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range)
      if (!match)
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${data.length}` },
        })
      const start = match[1]
        ? Number(match[1])
        : Math.max(0, data.length - Number(match[2]))
      const end =
        match[1] && match[2]
          ? Math.min(Number(match[2]), data.length - 1)
          : data.length - 1
      if (start > end || start >= data.length)
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${data.length}` },
        })
      return new Response(data.subarray(start, end + 1), {
        status: 206,
        headers: {
          ...headers,
          "Content-Range": `bytes ${start}-${end}/${data.length}`,
          "Content-Length": String(end - start + 1),
        },
      })
    }
    return new Response(data, {
      headers: { ...headers, "Content-Length": String(data.length) },
    })
  } catch {
    return new Response(null, { status: 404 })
  }
}
