import { AuthError } from "./errors"

/** A fresh credential per bot message, never a permanent user identifier. */
export function verifyTelegramCode(input: unknown): string {
  if (typeof input !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(input))
    throw new AuthError("Invalid sign-in link. Request a new one with /start.")
  return input
}
