import "server-only"
import path from "node:path"
import { stat } from "node:fs/promises"
export const programMediaRoot = () =>
  process.env.PROGRAM_MEDIA_ROOT ?? path.join(process.cwd(), ".program-media")
export const programImagePattern =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(png|jpg|webp)$/
export const ownerPattern = /^[1-9]\d{0,18}$/
export async function ownsProgramImage(url: string, userId: string) {
  const prefix = `/api/programs/files/${userId}/`
  if (!url.startsWith(prefix)) return false
  const name = url.slice(prefix.length)
  if (!programImagePattern.test(name)) return false
  try {
    return (await stat(path.join(programMediaRoot(), userId, name))).isFile()
  } catch {
    return false
  }
}
