CREATE TABLE IF NOT EXISTS telegram_chats (
    chat_id bigint PRIMARY KEY CHECK (chat_id < 0),
    title text NOT NULL,
    bot_username varchar(32),
    chat_type text NOT NULL CHECK (chat_type IN ('group','supergroup')),
    added_by_telegram_id bigint NOT NULL,
    bot_is_admin boolean NOT NULL DEFAULT false,
    active boolean NOT NULL DEFAULT false,
    locale varchar(2) NOT NULL DEFAULT 'en' CHECK(locale IN ('en','uk','nb','de','pl')),
    last_update_id bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS telegram_chat_managers (
    chat_id bigint NOT NULL REFERENCES telegram_chats(chat_id) ON DELETE CASCADE,
    telegram_id bigint NOT NULL CHECK(telegram_id>0),
    is_admin boolean NOT NULL DEFAULT false,
    verified_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(chat_id,telegram_id)
);
CREATE TABLE IF NOT EXISTS telegram_workout_preferences (
    user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    private_enabled boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS telegram_workout_subscriptions (
    chat_id bigint NOT NULL REFERENCES telegram_chats(chat_id) ON DELETE CASCADE,
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_by_user_id bigint REFERENCES users(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined')),
    enabled boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(chat_id,user_id),
    CHECK (NOT enabled OR status='accepted')
);
CREATE INDEX IF NOT EXISTS ix_telegram_workout_subscriptions_user ON telegram_workout_subscriptions(user_id);
-- This is both an outbox and the durable message mapping. Workout saves enqueue in their own transaction.
CREATE TABLE IF NOT EXISTS workout_telegram_messages (
    workout_id bigint NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    chat_id bigint NOT NULL,
    desired_revision uuid NOT NULL,
    delivered_revision uuid,
    message_id bigint,
    attempts integer NOT NULL DEFAULT 0,
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    lease_id uuid,
    lease_until timestamptz,
    cancelled_at timestamptz,
    last_error text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(workout_id,chat_id)
);
CREATE INDEX IF NOT EXISTS ix_workout_telegram_messages_pending ON workout_telegram_messages(next_attempt_at)
    WHERE cancelled_at IS NULL AND desired_revision IS DISTINCT FROM delivered_revision;

ALTER TABLE telegram_chats ADD COLUMN IF NOT EXISTS bot_username varchar(32);
