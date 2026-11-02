import "server-only"
import { pbkdf2, randomBytes, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const derive = promisify(pbkdf2)
// ASP.NET Identity V3 format, compatible with LeoCore's PasswordHasher<User>.
// https://github.com/dotnet/aspnetcore/blob/main/src/Identity/Extensions.Core/src/PasswordHasher.cs
export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const key = await derive(password, salt, 100_000, 32, "sha512")
  const header = Buffer.alloc(13)
  header[0] = 1
  header.writeUInt32BE(2, 1)
  header.writeUInt32BE(100_000, 5)
  header.writeUInt32BE(16, 9)
  return Buffer.concat([header, salt, key]).toString("base64")
}
export async function verifyPassword(password: string, encoded: string) {
  try {
    if (encoded.length > 2048) return false
    const bytes = Buffer.from(encoded, "base64")
    let salt: Buffer, expected: Buffer, iterations: number, digest: string
    if (bytes[0] === 0 && bytes.length === 49) {
      salt = bytes.subarray(1, 17)
      expected = bytes.subarray(17)
      iterations = 1000
      digest = "sha1"
    } else if (bytes[0] === 1 && bytes.length >= 45) {
      const prf = bytes.readUInt32BE(1)
      iterations = bytes.readUInt32BE(5)
      const size = bytes.readUInt32BE(9)
      if (
        prf > 2 ||
        iterations < 1 ||
        iterations > 2_000_000 ||
        size < 16 ||
        size > bytes.length - 29
      )
        return false
      salt = bytes.subarray(13, 13 + size)
      expected = bytes.subarray(13 + size)
      digest = ["sha1", "sha256", "sha512"][prf]
    } else return false
    const actual = await derive(
      password,
      salt,
      iterations,
      expected.length,
      digest
    )
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
