import {
  uuid,
  bigint,
  boolean,
  primaryKey,
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

// Shared exercise catalog. Schema upgrade is owned by LeoDatabase/Sql.
const exerciseType = pgEnum("exercise_type", [
  "repetitions",
  "distance",
  "duration",
])
const exerciseMediaType = pgEnum("exercise_media_type", ["image", "video"])
export const languages = pgTable("languages", {
  id: bigint("id", { mode: "bigint" })
    .primaryKey()
    .generatedByDefaultAsIdentity({ startWith: 100 }),
  code: varchar("code", { length: 35 }).notNull().unique(),
  nativeName: varchar("native_name", { length: 100 }).notNull(),
})
export const exercises = pgTable("exercises", {
  id: bigint("id", { mode: "bigint" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  name: text("name").notNull(),
  description: text("description"),
  type: exerciseType("type").notNull(),
  includesOwnWeight: boolean("includes_own_weight").notNull().default(false),
  includesAdditionalWeight: boolean("includes_additional_weight")
    .notNull()
    .default(false),
})
export const exerciseTranslations = pgTable(
  "exercise_translations",
  {
    exerciseId: bigint("exercise_id", { mode: "bigint" })
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    languageId: bigint("language_id", { mode: "bigint" })
      .notNull()
      .references(() => languages.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    ...timestamps(),
  },
  (table) => [primaryKey({ columns: [table.exerciseId, table.languageId] })]
)
export const exerciseMedia = pgTable("exercise_media", {
  id: bigint("id", { mode: "bigint" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  exerciseId: bigint("exercise_id", { mode: "bigint" })
    .notNull()
    .references(() => exercises.id, { onDelete: "cascade" }),
  type: exerciseMediaType("type").notNull(),
  position: integer("position").notNull(),
  ...timestamps(),
})
export const exerciseMediaTranslations = pgTable(
  "exercise_media_translations",
  {
    exerciseMediaId: bigint("exercise_media_id", { mode: "bigint" })
      .notNull()
      .references(() => exerciseMedia.id, { onDelete: "cascade" }),
    languageId: bigint("language_id", { mode: "bigint" })
      .notNull()
      .references(() => languages.id, { onDelete: "restrict" }),
    url: varchar("url", { length: 2048 }).notNull(),
    title: text("title"),
    description: text("description"),
    altText: text("alt_text"),
    ...timestamps(),
  },
  (table) => [
    primaryKey({ columns: [table.exerciseMediaId, table.languageId] }),
  ]
)

export const programs = pgTable("programs", {
  id: bigint("id", { mode: "bigint" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  name: text("name").notNull(),
  authorId: bigint("author_id", { mode: "bigint" }).references(() => users.id, {
    onDelete: "restrict",
  }),
  isPublic: boolean("is_public").notNull().default(false),
  ...timestamps(),
})
export const programDescriptions = pgTable(
  "program_descriptions",
  {
    programId: bigint("program_id", { mode: "bigint" })
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    languageId: bigint("language_id", { mode: "bigint" })
      .notNull()
      .references(() => languages.id, { onDelete: "restrict" }),
    description: text("description").notNull().default(""),
    imageUrl: varchar("image_url", { length: 2048 }),
    imageAlt: text("image_alt").notNull().default(""),
    ...timestamps(),
  },
  (table) => [primaryKey({ columns: [table.programId, table.languageId] })]
)

// Bot preferences are available before a web account exists.
export const telegramUserPreferences = pgTable("telegram_user_preferences", {
  telegramId: bigint("telegram_id", { mode: "bigint" }).primaryKey(),
  languageId: bigint("language_id", { mode: "bigint" })
    .notNull()
    .references(() => languages.id, { onDelete: "restrict" }),
  ...timestamps(),
})

export const telegramSigninLinks = pgTable("telegram_signin_links", {
  codeHash: text("code_hash").primaryKey(),
  telegramId: bigint("telegram_id", { mode: "bigint" }).notNull(),
  chatId: bigint("chat_id", { mode: "bigint" }).notNull(),
  telegramUsername: varchar("telegram_username", { length: 32 }).notNull().default(""),
  locale: varchar("locale", { length: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
})

// Existing workouts table (mapped for the outbox foreign key).
export const workouts = pgTable("workouts", {
  id: bigint("id", { mode: "bigint" }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint("user_id", { mode: "bigint" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  programDayId: bigint("program_day_id", { mode: "bigint" }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ...timestamps(),
})
// Telegram group discovery, consent and transactional workout outbox.
export const telegramChats = pgTable("telegram_chats", {
  chatId: bigint("chat_id", { mode: "bigint" }).primaryKey(),
  title: text("title").notNull(),
  botUsername: varchar("bot_username", { length: 32 }),
  chatType: text("chat_type").notNull(),
  addedByTelegramId: bigint("added_by_telegram_id", { mode: "bigint" }).notNull(),
  botIsAdmin: boolean("bot_is_admin").notNull().default(false),
  active: boolean("active").notNull().default(false),
  locale: varchar("locale", { length: 2 }).notNull().default("en"),
  lastUpdateId: bigint("last_update_id", { mode: "bigint" }).notNull().default(BigInt(0)),
  ...timestamps(),
})
export const telegramChatManagers = pgTable("telegram_chat_managers", {
  chatId: bigint("chat_id", { mode: "bigint" }).notNull().references(() => telegramChats.chatId, { onDelete: "cascade" }),
  telegramId: bigint("telegram_id", { mode: "bigint" }).notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [primaryKey({ columns: [t.chatId, t.telegramId] })])
export const telegramWorkoutPreferences = pgTable("telegram_workout_preferences", {
  userId: bigint("user_id", { mode: "bigint" }).primaryKey().references(() => users.id, { onDelete: "cascade" }),
  privateEnabled: boolean("private_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
export const telegramWorkoutSubscriptions = pgTable("telegram_workout_subscriptions", {
  chatId: bigint("chat_id", { mode: "bigint" }).notNull().references(() => telegramChats.chatId, { onDelete: "cascade" }),
  userId: bigint("user_id", { mode: "bigint" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  invitedByUserId: bigint("invited_by_user_id", { mode: "bigint" }).references(() => users.id, { onDelete: "set null" }),
  status: text("status").notNull().default("pending"),
  enabled: boolean("enabled").notNull().default(false),
  ...timestamps(),
}, t => [primaryKey({ columns: [t.chatId, t.userId] })])
export const workoutTelegramMessages = pgTable("workout_telegram_messages", {
  workoutId: bigint("workout_id", { mode: "bigint" }).notNull(),
  chatId: bigint("chat_id", { mode: "bigint" }).notNull(),
  deleteRequested: boolean("delete_requested").notNull().default(false),
  deleteAttempts: integer("delete_attempts").notNull().default(0),
  deleteNextAttemptAt: timestamp("delete_next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  desiredRevision: uuid("desired_revision").notNull(),
  deliveredRevision: uuid("delivered_revision"),
  messageId: bigint("message_id", { mode: "bigint" }),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  leaseId: uuid("lease_id"),
  leaseUntil: timestamp("lease_until", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  lastError: text("last_error"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [primaryKey({ columns: [t.workoutId, t.chatId] })])

export const telegramConnectionNotifications = pgTable("telegram_connection_notifications", {
  chatId: bigint("chat_id", { mode: "bigint" }).notNull(),
  updateId: bigint("update_id", { mode: "bigint" }).notNull(),
  recipientId: bigint("recipient_id", { mode: "bigint" }).notNull(),
  title: text("title").notNull(),
  chatUsername: text("chat_username"),
  locale: varchar("locale", { length: 2 }).notNull().default("en"),
  active: boolean("active").notNull(),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
}, t => [primaryKey({ columns: [t.chatId, t.updateId] })])
