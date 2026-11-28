import { createHash, randomBytes } from "node:crypto"
import { and, eq, gt, isNull, sql } from "drizzle-orm"
import { getDb } from "@/lib/db"
import {
  telegramSigninLinks,
  users,
  userTelegram,
  userProfiles,
  userSettings,
  userSessions,
} from "@/lib/db/schema"
import { AuthError } from "./errors"
import { verifyTelegramCode } from "./telegram-link"

export const REFRESH_LIFETIME_SECONDS = 30 * 24 * 60 * 60
// Match LeoCore's SHA-256 / uppercase-hex refresh-token storage format.
export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex").toUpperCase()
export const randomRefreshToken = () =>
  randomBytes(32).toString("hex").toUpperCase()

export async function signInTelegram(code: string) {
  verifyTelegramCode(code)
  const db = getDb()
  const refreshToken = randomRefreshToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + REFRESH_LIFETIME_SECONDS * 1000)
  const result = await db.transaction(async (tx) => {
    // Redemption and account/session creation commit together. Concurrent replays lose this update.
    const [link] = await tx.update(telegramSigninLinks)
      .set({ consumedAt: now })
      .where(and(
        eq(telegramSigninLinks.codeHash, hashToken(code)),
        isNull(telegramSigninLinks.consumedAt),
        gt(telegramSigninLinks.expiresAt, sql`CURRENT_TIMESTAMP`)
      ))
      .returning()
    if (!link) throw new AuthError("This link is invalid, expired or already used. Request a new one with /start.")
    const locale = link.locale
    // Serialize sign-ups for one Telegram identity; two different valid links cannot create duplicate users.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${link.telegramId.toString()}, 0))`
    )
    const [existing] = await tx
      .select({ userId: userTelegram.userId })
      .from(userTelegram)
      .where(eq(userTelegram.telegramId, link.telegramId))
      .limit(1)
    let userId = existing?.userId
    if (userId === undefined) {
      const [created] = await tx
        .insert(users)
        .values({
          nickname: link.telegramUsername || `telegram_${link.telegramId.toString()}`,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: users.id })
      userId = created.id
      await tx.insert(userTelegram).values({
        userId,
        telegramId: link.telegramId,
        chatId: link.chatId,
      })
    } else {
      await tx
        .update(userTelegram)
        .set({ chatId: link.chatId })
        .where(eq(userTelegram.userId, userId))
    }
    // Preserve all existing nicknames/profile/preferences; initialize missing personal records.
    await tx
      .insert(userProfiles)
      .values({ userId, updatedAt: now })
      .onConflictDoNothing()
    await tx
      .insert(userSettings)
      .values({ userId, language: locale, updatedAt: now })
      .onConflictDoNothing()
    const [session] = await tx
      .insert(userSessions)
      .values({
        userId,
        refreshTokenHash: hashToken(refreshToken),
        device: "Telegram web",
        expiresAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: userSessions.id })
    return { userId: userId.toString(), sessionId: session.id.toString(), locale }
  })
  return { ...result, refreshToken, expiresAt }
}

export async function rotateRefreshToken(token: string) {
  if (!/^[A-F0-9]{64}$/.test(token))
    throw new AuthError("Please sign in again through the bot.")
  const refreshToken = randomRefreshToken()
  const [session] = await getDb()
    .update(userSessions)
    .set({ refreshTokenHash: hashToken(refreshToken), updatedAt: new Date() })
    .where(
      and(
        eq(userSessions.refreshTokenHash, hashToken(token)),
        isNull(userSessions.revokedAt),
        gt(userSessions.expiresAt, new Date())
      )
    )
    .returning({
      userId: userSessions.userId,
      sessionId: userSessions.id,
      expiresAt: userSessions.expiresAt,
    })
  if (!session)
    throw new AuthError(
      "Your session has expired. Please sign in again through the bot."
    )
  return {
    userId: session.userId.toString(),
    sessionId: session.sessionId.toString(),
    expiresAt: session.expiresAt,
    refreshToken,
  }
}

export async function revokeRefreshToken(token: string) {
  if (/^[A-F0-9]{64}$/.test(token))
    await getDb()
      .update(userSessions)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(userSessions.refreshTokenHash, hashToken(token)))
}

export async function findSessionUser(userId: string, sessionId: string) {
  if (!/^[1-9][0-9]*$/.test(userId) || !/^[1-9][0-9]*$/.test(sessionId))
    return null
  const [user] = await getDb()
    .select({
      nickname: users.nickname,
      userId: users.id,
      sessionId: userSessions.id,
    })
    .from(users)
    .innerJoin(userSessions, eq(users.id, userSessions.userId))
    .where(
      and(
        eq(users.id, BigInt(userId)),
        eq(userSessions.id, BigInt(sessionId)),
        isNull(userSessions.revokedAt),
        gt(userSessions.expiresAt, new Date())
      )
    )
    .limit(1)
  return user
    ? {
        nickname: user.nickname,
        userId: user.userId.toString(),
        sessionId: user.sessionId.toString(),
      }
    : null
}
