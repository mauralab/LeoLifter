import "server-only"
import path from "node:path"
export const mediaRoot = () =>
  process.env.EXERCISE_MEDIA_ROOT ?? path.join(process.cwd(), ".exercise-media")
export const filePattern = /^[a-f0-9-]{36}\.(png|jpg|webp|mp4|webm)$/
export const mime: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
}
