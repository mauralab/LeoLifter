import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { currentUser, requireSameOrigin } from "@/lib/auth/session"
import { mediaRoot } from "@/lib/exercises/files"
export async function POST(request: Request) {
  try {
    if (!requireSameOrigin(request))
      return Response.json(
        { error: "Invalid request origin." },
        { status: 403 }
      )
    if (!(await currentUser()))
      return Response.json({ error: "Please sign in again." }, { status: 401 })
    const reader = request.body?.getReader()
    if (!reader)
      return Response.json({ error: "Missing file." }, { status: 400 })
    let size = 0
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > 26 * 1024 * 1024) {
        await reader.cancel()
        return Response.json(
          { error: "Upload limit is 25 MB." },
          { status: 413 }
        )
      }
      chunks.push(value)
    }
    const form = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData()
    const file = form.get("file")
    if (!(file instanceof File) || file.size === 0)
      return Response.json({ error: "Choose a file." }, { status: 400 })
    const b = Buffer.from(await file.arrayBuffer())
    let ext = ""
    if (b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
      ext = "png"
    else if (b[0] === 255 && b[1] === 216 && b[2] === 255) ext = "jpg"
    else if (
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP"
    )
      ext = "webp"
    else if (b.toString("ascii", 4, 8) === "ftyp") ext = "mp4"
    else if (b.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163])))
      ext = "webm"
    if (!ext)
      return Response.json(
        { error: "Use PNG, JPEG, WebP, MP4 or WebM." },
        { status: 400 }
      )
    if (file.size > (["mp4", "webm"].includes(ext) ? 25 : 5) * 1024 * 1024)
      return Response.json(
        { error: "Images: 5 MB maximum. Videos: 25 MB maximum." },
        { status: 413 }
      )
    await mkdir(mediaRoot(), { recursive: true })
    const name = `${randomUUID()}.${ext}`
    await writeFile(path.join(mediaRoot(), name), b, { flag: "wx" })
    return Response.json(
      { url: `/api/exercises/files/${name}` },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch {
    return Response.json({ error: "Unable to upload file." }, { status: 400 })
  }
}
