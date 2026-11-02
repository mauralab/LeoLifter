import "server-only"
import { randomBytes } from "node:crypto"
import { and, eq, sql, inArray } from "drizzle-orm"
import { getDb } from "@/lib/db"
import {
  authRateLimits,
  passwordLoginRequests,
  userPasswords,
  userTelegram,
  users,
  userSessions,
} from "@/lib/db/schema"
import { hashPassword, verifyPassword } from "./password"
import {
  hashToken,
  randomRefreshToken,
  REFRESH_LIFETIME_SECONDS,
} from "./store"
import type { Locale } from "@/lib/i18n"
export const LOGIN_COOKIE = "leo_login_request"
export const APPROVAL_SECONDS = 300
export class PasswordLoginError extends Error {
  constructor(public code: "invalidCredentials" | "rateLimited") {
    super(code)
  }
}
// Unknown users still perform password derivation, matching valid-account work.
const dummyHash = hashPassword(
  "Not an account password " + randomBytes(32).toString("hex")
)
function proof(value?: string) {
  const parts = value?.split(".")
  return parts?.length === 2 &&
    /^[a-f0-9]{32}$/.test(parts[0]) &&
    /^[a-f0-9]{64}$/.test(parts[1])
    ? { id: parts[0], tokenHash: hashToken(parts[1]) }
    : null
}
function deviceLabel(agent: string) {
  const browser = /Edg\//.test(agent)
    ? "Edge"
    : /Firefox\//.test(agent)
      ? "Firefox"
      : /Chrome\//.test(agent)
        ? "Chrome"
        : /Safari\//.test(agent)
          ? "Safari"
          : "Browser"
  const os = /Android/.test(agent)
    ? "Android"
    : /iPhone|iPad/.test(agent)
      ? "iOS"
      : /Windows/.test(agent)
        ? "Windows"
        : /Macintosh/.test(agent)
          ? "macOS"
          : /Linux/.test(agent)
            ? "Linux"
            : "Web"
  return `${browser} · ${os}`
}
export async function beginPasswordLogin(
  nickname: string,
  password: string,
  locale: Locale,
  userAgent: string,
  previous?: string
) {
  const db = getDb()
  const name = nickname.trim()
  if (!name || name.length > 100 || !password || password.length > 128)
    throw new PasswordLoginError("invalidCredentials")
  const key = hashToken(`password-login:${name.toLowerCase()}`)
  const [limit] = await db
    .insert(authRateLimits)
    .values({ keyHash: key, attempts: 1 })
    .onConflictDoUpdate({
      target: authRateLimits.keyHash,
      set: {
        attempts: sql`case when ${authRateLimits.windowStart} < now() - interval '15 minutes' then 1 else ${authRateLimits.attempts} + 1 end`,
        windowStart: sql`case when ${authRateLimits.windowStart} < now() - interval '15 minutes' then now() else ${authRateLimits.windowStart} end`,
      },
    })
    .returning({ attempts: authRateLimits.attempts })
  if (limit.attempts > 10) throw new PasswordLoginError("rateLimited")
  const candidates = await db
    .select({
      id: users.id,
      hash: userPasswords.passwordHash,
      telegramId: userTelegram.telegramId,
      chatId: userTelegram.chatId,
    })
    .from(users)
    .leftJoin(userPasswords, eq(userPasswords.userId, users.id))
    .leftJoin(userTelegram, eq(userTelegram.userId, users.id))
    .where(sql`lower(${users.nickname}) = lower(${name})`)
    .limit(2)
  const account = candidates.length === 1 ? candidates[0] : undefined
  const valid = await verifyPassword(
    password,
    account?.hash ?? (await dummyHash)
  )
  if (
    !valid ||
    !account?.hash ||
    !account.telegramId ||
    account.telegramId !== account.chatId ||
    account.telegramId <= BigInt(0)
  )
    throw new PasswordLoginError("invalidCredentials")
  const id = randomBytes(16).toString("hex"),
    token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + APPROVAL_SECONDS * 1000)
  await db.transaction(async (tx) => {
    // Serialize with password changes. Recheck the credential after password derivation.
    await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, account.id))
      .for("update")
    const [current] = await tx
      .select({ hash: userPasswords.passwordHash })
      .from(userPasswords)
      .where(eq(userPasswords.userId, account.id))
    if (current?.hash !== account.hash)
      throw new PasswordLoginError("invalidCredentials")
    const old = proof(previous)
    if (old)
      await tx
        .update(passwordLoginRequests)
        .set({ status: "denied", decidedAt: new Date() })
        .where(
          and(
            eq(passwordLoginRequests.id, old.id),
            eq(passwordLoginRequests.browserTokenHash, old.tokenHash),
            inArray(passwordLoginRequests.status, ["pending", "approved"])
          )
        )
    await tx
      .insert(passwordLoginRequests)
      .values({
        id,
        userId: account.id,
        credentialHash: hashToken(account.hash!),
        browserTokenHash: hashToken(token),
        telegramId: account.telegramId!,
        chatId: account.chatId!,
        locale,
        device: deviceLabel(userAgent),
        expiresAt,
      })
  })
  return {
    cookie: `${id}.${token}`,
    reference: id.slice(0, 6).toUpperCase(),
    expiresAt: expiresAt.toISOString(),
  }
}
export async function passwordLoginStatus(value?: string, cancel = false) {
  const browser = proof(value)
  if (!browser) return { status: "none" as const }
  return getDb().transaction(async (tx) => {
    const [owner] = await tx
      .select({ userId: passwordLoginRequests.userId })
      .from(passwordLoginRequests)
      .where(
        and(
          eq(passwordLoginRequests.id, browser.id),
          eq(passwordLoginRequests.browserTokenHash, browser.tokenHash)
        )
      )
    if (!owner) return { status: "none" as const }
    await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, owner.userId))
      .for("update")
    const [request] = await tx
      .select()
      .from(passwordLoginRequests)
      .where(
        and(
          eq(passwordLoginRequests.id, browser.id),
          eq(passwordLoginRequests.browserTokenHash, browser.tokenHash)
        )
      )
      .for("update")
    if (!request) return { status: "none" as const }
    if (cancel && ["pending", "approved"].includes(request.status)) {
      await tx
        .update(passwordLoginRequests)
        .set({ status: "denied", decidedAt: new Date() })
        .where(eq(passwordLoginRequests.id, request.id))
      return { status: "denied" as const }
    }
    if (request.expiresAt.getTime() <= Date.now())
      return { status: "expired" as const }
    if (request.status === "pending")
      return {
        status: "pending" as const,
        reference: request.id.slice(0, 6).toUpperCase(),
        expiresAt: request.expiresAt.toISOString(),
      }
    if (request.status !== "approved")
      return {
        status:
          request.status === "denied"
            ? ("denied" as const)
            : ("expired" as const),
      }
    const [credentials] = await tx
      .select({
        hash: userPasswords.passwordHash,
        telegramId: userTelegram.telegramId,
        chatId: userTelegram.chatId,
      })
      .from(userPasswords)
      .innerJoin(userTelegram, eq(userTelegram.userId, userPasswords.userId))
      .where(eq(userPasswords.userId, request.userId))
    if (
      !credentials ||
      hashToken(credentials.hash) !== request.credentialHash ||
      credentials.telegramId !== request.telegramId ||
      credentials.chatId !== request.chatId
    ) {
      await tx
        .update(passwordLoginRequests)
        .set({ status: "denied", decidedAt: new Date() })
        .where(eq(passwordLoginRequests.id, request.id))
      return { status: "denied" as const }
    }
    const refreshToken = randomRefreshToken(),
      expiresAt = new Date(Date.now() + REFRESH_LIFETIME_SECONDS * 1000)
    const [session] = await tx
      .insert(userSessions)
      .values({
        userId: request.userId,
        refreshTokenHash: hashToken(refreshToken),
        device: request.device,
        expiresAt,
      })
      .returning({ id: userSessions.id })
    await tx
      .update(passwordLoginRequests)
      .set({ status: "consumed" })
      .where(eq(passwordLoginRequests.id, request.id))
    return {
      status: "signedIn" as const,
      session: {
        userId: request.userId.toString(),
        sessionId: session.id.toString(),
        refreshToken,
        expiresAt,
      },
    }
  })
}
