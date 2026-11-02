import {
  bigint,
  integer,
  date,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core"

// Existing EF Core tables: these definitions map them; Drizzle does not migrate them.
const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})
export const users = pgTable("users", {
  id: bigint("id", { mode: "bigint" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  nickname: varchar("nickname", { length: 100 }).notNull(),
  ...timestamps(),
})
export const userTelegram = pgTable("user_telegram", {
  userId: bigint("user_id", { mode: "bigint" })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  chatId: bigint("chat_id", { mode: "bigint" }).notNull(),
  telegramId: bigint("telegram_id", { mode: "bigint" }).notNull().unique(),
})
const weightUnit = pgEnum("weight_unit", ["kg", "lb"])
const lengthUnit = pgEnum("length_unit", ["cm", "m", "in", "ft"])
export const userProfiles = pgTable("user_profiles", {
  userId: bigint("user_id", { mode: "bigint" })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  sex: text("sex"),
  birthDate: date("birth_date"),
  height: numeric("height", { precision: 7, scale: 2 }),
  heightUnit: lengthUnit("height_unit"),
  country: varchar("country", { length: 2 }),
  city: text("city"),
  timezone: text("timezone"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})
export const userSettings = pgTable("user_settings", {
  userId: bigint("user_id", { mode: "bigint" })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  language: text("language").notNull().default("en"),
  weightMeasureUnit: weightUnit("weight_measure_unit").notNull().default("kg"),
  lengthMeasureUnit: lengthUnit("length_measure_unit").notNull().default("cm"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})
export const userSessions = pgTable("user_sessions", {
  id: bigint("id", { mode: "bigint" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  userId: bigint("user_id", { mode: "bigint" })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  refreshTokenHash: text("refresh_token_hash").notNull().unique(),
  device: text("device"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...timestamps(),
})
// Only this new auth table is introduced by db/migrations/0001_telegram_login_links.sql.
export const telegramLoginLinks = pgTable("telegram_login_links", {
  nonceHash: text("nonce_hash").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const userPasswords = pgTable("user_passwords", {
  userId: bigint("user_id", { mode: "bigint" })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
})

export const passwordLoginRequests = pgTable("password_login_requests", {
  id: text("id").primaryKey(),
  userId: bigint("user_id", { mode: "bigint" })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  browserTokenHash: text("browser_token_hash").notNull().unique(),
  credentialHash: text("credential_hash").notNull(),
  telegramId: bigint("telegram_id", { mode: "bigint" }).notNull(),
  chatId: bigint("chat_id", { mode: "bigint" }).notNull(),
  locale: text("locale").notNull(),
  device: text("device").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  messageId: bigint("message_id", { mode: "bigint" }),
  sendAttempts: integer("send_attempts").notNull().default(0),
  lastSendAttemptAt: timestamp("last_send_attempt_at", { withTimezone: true }),
})
export const authRateLimits = pgTable("auth_rate_limits", {
  keyHash: text("key_hash").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true })
    .notNull()
    .defaultNow(),
  attempts: integer("attempts").notNull(),
})
