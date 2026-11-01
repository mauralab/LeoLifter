import { createHmac, timingSafeEqual } from "node:crypto"
import { AuthError, requiredSecret } from "./errors"

export const telegramFields = [
  "tg_id",
  "tg_username",
  "chat_id",
  "iat",
  "nonce",
  "sig",
] as const
export type TelegramLink = Record<(typeof telegramFields)[number], string>
export const LINK_LIFETIME_SECONDS = 300

/** Same UTF-8 canonical format as LeoBot/Authentication/TelegramLoginLinkFactory.cs. */
export function verifyTelegramLink(
  input: Record<string, unknown>,
  now = Math.floor(Date.now() / 1000)
) {
  const fields = {} as TelegramLink
  for (const key of telegramFields) {
    if (typeof input[key] !== "string")
      throw new AuthError("Invalid sign-in link.")
    fields[key] = input[key]
  }
  if (
    !/^[1-9][0-9]{0,15}$/.test(fields.tg_id) ||
    fields.chat_id !== fields.tg_id ||
    !/^[A-Za-z0-9_]{0,32}$/.test(fields.tg_username) ||
    !/^[0-9]{10}$/.test(fields.iat) ||
    !/^[a-f0-9]{32}$/.test(fields.nonce) ||
    !/^[a-f0-9]{64}$/.test(fields.sig)
  ) {
    throw new AuthError("Invalid sign-in link.")
  }
  const issued = Number(fields.iat)
  if (issued > now + 30 || now - issued > LINK_LIFETIME_SECONDS)
    throw new AuthError(
      "This sign-in link has expired. Request a new one with /start."
    )
  const canonical = [
    "v1",
    fields.tg_id,
    fields.tg_username,
    fields.chat_id,
    fields.iat,
    fields.nonce,
  ].join("\n")
  const expected = createHmac("sha256", requiredSecret("TELEGRAM_AUTH_SECRET"))
    .update(canonical)
    .digest()
  if (!timingSafeEqual(expected, Buffer.from(fields.sig, "hex")))
    throw new AuthError("Invalid sign-in link.")
  return fields
}
