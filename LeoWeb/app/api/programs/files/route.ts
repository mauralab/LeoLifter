import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { currentUser, requireSameOrigin } from "@/lib/auth/session"
import { programMediaRoot } from "@/lib/programs/files"
export async function POST(request: Request) {
  try {
    if (!requireSameOrigin(request))
      return Response.json(
        { error: "Invalid request origin." },
        { status: 403 }
      )
    const user = await currentUser()
    if (!user)
      return Response.json({ error: "Please sign in again." }, { status: 401 })
    const reader = request.body?.getReader()
    if (!reader)
      return Response.json({ error: "Choose an image." }, { status: 400 })
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.length
      if (size > 6 * 1024 * 1024) {
        await reader.cancel()
        return Response.json(
          { error: "Images must not exceed 5 MB." },
          { status: 413 }
        )
      }
      chunks.push(value)
    }
    const form = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData()
    const file = form.get("file")
    if (!(file instanceof File) || !file.size)
      return Response.json({ error: "Choose an image." }, { status: 400 })
    if (file.size > 5 * 1024 * 1024)
      return Response.json(
        { error: "Images must not exceed 5 MB." },
        { status: 413 }
      )
    const bytes = Buffer.from(await file.arrayBuffer())
    const extension = bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? "png"
      : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        ? "jpg"
        : bytes.toString("ascii", 0, 4) === "RIFF" &&
            bytes.toString("ascii", 8, 12) === "WEBP"
          ? "webp"
          : null
    if (!extension)
      return Response.json({ error: "Use PNG, JPEG or WebP." }, { status: 400 })
    const directory = path.join(programMediaRoot(), user.userId)
    await mkdir(directory, { recursive: true })
    const name = `${randomUUID()}.${extension}`
    await writeFile(path.join(directory, name), bytes, { flag: "wx" })
    return Response.json(
      { url: `/api/programs/files/${user.userId}/${name}` },
      { headers: { "Cache-Control": "private, no-store" } }
    )
  } catch {
    return Response.json({ error: "Unable to upload image." }, { status: 400 })
  }
}
