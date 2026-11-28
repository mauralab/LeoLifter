import { readFile } from "node:fs/promises"
import path from "node:path"
import { currentUser } from "@/lib/auth/session"
import { getPool } from "@/lib/db"
import {
  programMediaRoot,
  programImagePattern,
  ownerPattern,
} from "@/lib/programs/files"
export const dynamic = "force-dynamic"
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; name: string }> }
) {
  const { owner, name } = await params
  if (!ownerPattern.test(owner) || !programImagePattern.test(name))
    return new Response(null, { status: 404 })
  try {
    const user = await currentUser()
    if (user?.userId !== owner) {
      const publicImage = await getPool().query(
        `SELECT 1 FROM program_descriptions d JOIN programs p ON p.id=d.program_id WHERE d.image_url=$1 AND p.is_public=true LIMIT 1`,
        [`/api/programs/files/${owner}/${name}`]
      )
      if (!publicImage.rowCount)
        return new Response(null, {
          status: 404,
          headers: { "Cache-Control": "private, no-store" },
        })
    }
    const data = await readFile(path.join(programMediaRoot(), owner, name))
    return new Response(data, {
      headers: {
        "Content-Type": {
          png: "image/png",
          jpg: "image/jpeg",
          webp: "image/webp",
        }[name.split(".").pop()!]!,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    })
  } catch {
    return new Response(null, { status: 404 })
  }
}
