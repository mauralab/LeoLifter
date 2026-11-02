import "server-only"
import { and, eq, ne, desc, sql, gt, isNull, count } from "drizzle-orm"
import { getDb } from "@/lib/db"
import {
  users,
  userProfiles,
  userSettings,
  userSessions,
  userPasswords,
  userTelegram,
} from "@/lib/db/schema"
import { hashPassword, verifyPassword } from "@/lib/auth/password"
import { passwordInput, profileInput, settingsInput } from "./validation"
export class ProfileError extends Error {
  constructor(
    public code:
      | "invalid"
      | "passwordWrong"
      | "passwordInvalid"
      | "unauthorized"
      | "notFound"
      | "rateLimited",
    public fields: string[] = []
  ) {
    super(code)
  }
}
export type Identity = { userId: string; sessionId: string }
export async function loadProfile(identity: Identity, requestedPage = 1) {
  const db = getDb(),
    userId = BigInt(identity.userId)
  const visibleSessions = and(
    eq(userSessions.userId, userId),
    isNull(userSessions.revokedAt)
  )
  const [[account], [totals]] = await Promise.all([
    db
      .select({
        nickname: users.nickname,
        profile: userProfiles,
        settings: userSettings,
        hasPassword: sql<boolean>`exists(select 1 from ${userPasswords} where ${userPasswords.userId} = ${users.id})`,
        telegramLinked: sql<boolean>`exists(select 1 from ${userTelegram} where ${userTelegram.userId} = ${users.id})`,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(userSettings, eq(users.id, userSettings.userId))
      .where(eq(users.id, userId))
      .limit(1),
    db.select({ total: count() }).from(userSessions).where(visibleSessions),
  ])
  const pages = Math.max(1, Math.ceil(totals.total / 10)),
    page = Math.max(1, Math.min(requestedPage, pages))
  const sessions = await db
    .select({
      id: userSessions.id,
      device: userSessions.device,
      createdAt: userSessions.createdAt,
      updatedAt: userSessions.updatedAt,
      expiresAt: userSessions.expiresAt,
      revokedAt: userSessions.revokedAt,
    })
    .from(userSessions)
    .where(visibleSessions)
    .orderBy(desc(userSessions.createdAt), desc(userSessions.id))
    .limit(10)
    .offset((page - 1) * 10)
  if (!account) throw new ProfileError("unauthorized")
  const p = account.profile,
    s = account.settings
  return {
    nickname: account.nickname,
    hasPassword: account.hasPassword,
    telegramLinked: account.telegramLinked,
    profile: {
      nickname: account.nickname,
      sex: p?.sex ?? "",
      birthDate: p?.birthDate ?? "",
      height: p?.height ?? "",
      heightUnit: p?.heightUnit ?? s?.lengthMeasureUnit ?? "cm",
      country: p?.country ?? "",
      city: p?.city ?? "",
      timezone: p?.timezone ?? "",
    },
    settings: {
      language: s?.language ?? "en",
      weightMeasureUnit: s?.weightMeasureUnit ?? "kg",
      lengthMeasureUnit: s?.lengthMeasureUnit ?? "cm",
    },
    sessions: sessions.map((s) => ({
      id: s.id.toString(),
      device: s.device,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      revokedAt: s.revokedAt?.toISOString() ?? null,
      status: s.revokedAt
        ? ("revoked" as const)
        : s.expiresAt.getTime() <= Date.now()
          ? ("expired" as const)
          : ("active" as const),
      current: s.id.toString() === identity.sessionId,
    })),
    page,
    pages,
    total: totals.total,
  }
}
export type ProfileData = Awaited<ReturnType<typeof loadProfile>>
// Per-process throttle bounds expensive password work. Multi-instance deployments need a shared limiter.
const globalLimits = globalThis as unknown as {
  leoPasswordLimits?: Map<string, { count: number; until: number }>
}
function limitPassword(userId: string) {
  const limits = (globalLimits.leoPasswordLimits ??= new Map())
  const now = Date.now()
  for (const [key, value] of limits) if (value.until <= now) limits.delete(key)
  const item = limits.get(userId) ?? { count: 0, until: now + 15 * 60_000 }
  if (item.count >= 5 || (!limits.has(userId) && limits.size >= 10_000))
    throw new ProfileError("rateLimited")
  item.count++
  limits.set(userId, item)
}
export async function changeProfile(identity: Identity, form: FormData) {
  const action = form.get("action")
  if (
    !["profile", "settings", "password", "revoke", "revokeOthers"].includes(
      String(action)
    )
  )
    throw new ProfileError("invalid")
  if (action === "password") limitPassword(identity.userId)
  const input = Object.fromEntries(form)
  const schema =
    action === "profile"
      ? profileInput
      : action === "settings"
        ? settingsInput
        : action === "password"
          ? passwordInput
          : null
  const parsed = schema?.safeParse(input)
  if (parsed && !parsed.success)
    throw new ProfileError(
      action === "password" ? "passwordInvalid" : "invalid",
      parsed.error.issues.map((i) => String(i.path[0] ?? "form"))
    )
  return getDb().transaction(async (tx) => {
    const userId = BigInt(identity.userId),
      sessionId = BigInt(identity.sessionId)
    // Serialize profile/security changes for this user and recheck the session after acquiring the lock.
    await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .for("update")
    const [active] = await tx
      .select({ id: userSessions.id })
      .from(userSessions)
      .where(
        and(
          eq(userSessions.id, sessionId),
          eq(userSessions.userId, userId),
          isNull(userSessions.revokedAt),
          gt(userSessions.expiresAt, new Date())
        )
      )
      .for("update")
    if (!active) throw new ProfileError("unauthorized")
    const now = new Date()
    if (action === "profile") {
      const { nickname, ...profile } = profileInput.parse(input)
      await tx
        .update(users)
        .set({ nickname, updatedAt: now })
        .where(eq(users.id, userId))
      await tx
        .insert(userProfiles)
        .values({ ...profile, userId, updatedAt: now })
        .onConflictDoUpdate({
          target: userProfiles.userId,
          set: { ...profile, updatedAt: now },
        })
    } else if (action === "settings") {
      const settings = settingsInput.parse(input)
      await tx
        .insert(userSettings)
        .values({ ...settings, userId, updatedAt: now })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: { ...settings, updatedAt: now },
        })
    } else if (action === "password") {
      const values = passwordInput.parse(input)
      const [stored] = await tx
        .select({ hash: userPasswords.passwordHash })
        .from(userPasswords)
        .where(eq(userPasswords.userId, userId))
      if (
        stored &&
        !(await verifyPassword(values.currentPassword, stored.hash))
      )
        throw new ProfileError("passwordWrong", ["currentPassword"])
      const passwordHash = await hashPassword(values.password)
      await tx
        .insert(userPasswords)
        .values({ userId, passwordHash })
        .onConflictDoUpdate({
          target: userPasswords.userId,
          set: { passwordHash },
        })
      await tx
        .update(userSessions)
        .set({ revokedAt: now, updatedAt: now })
        .where(
          and(
            eq(userSessions.userId, userId),
            ne(userSessions.id, sessionId),
            isNull(userSessions.revokedAt)
          )
        )
    } else {
      const target = form.get("sessionId")
      if (
        action === "revoke" &&
        (typeof target !== "string" || !/^[1-9][0-9]{0,18}$/.test(target))
      )
        throw new ProfileError("invalid")
      const revoked = await tx
        .update(userSessions)
        .set({ revokedAt: now, updatedAt: now })
        .where(
          and(
            eq(userSessions.userId, userId),
            isNull(userSessions.revokedAt),
            ...(action === "revokeOthers"
              ? [ne(userSessions.id, sessionId)]
              : [eq(userSessions.id, BigInt(target as string))])
          )
        )
        .returning({ id: userSessions.id })
      if (action === "revoke" && !revoked.length)
        throw new ProfileError("notFound")
      return { signedOut: action === "revoke" && target === identity.sessionId }
    }
    return { signedOut: false }
  })
}
