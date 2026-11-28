-- Keep message IDs after the workout is deleted, until Telegram deletion completes.
ALTER TABLE workout_telegram_messages DROP CONSTRAINT IF EXISTS workout_telegram_messages_workout_id_fkey;
ALTER TABLE workout_telegram_messages ADD COLUMN IF NOT EXISTS delete_requested boolean NOT NULL DEFAULT false;
ALTER TABLE workout_telegram_messages ADD COLUMN IF NOT EXISTS delete_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE workout_telegram_messages ADD COLUMN IF NOT EXISTS delete_next_attempt_at timestamptz NOT NULL DEFAULT now();
CREATE TABLE IF NOT EXISTS telegram_connection_notifications (
    chat_id bigint NOT NULL,
    update_id bigint NOT NULL,
    recipient_id bigint NOT NULL CHECK(recipient_id>0),
    title text NOT NULL,
    chat_username text,
    locale varchar(2) NOT NULL DEFAULT 'en',
    active boolean NOT NULL,
    attempts integer NOT NULL DEFAULT 0,
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    delivered_at timestamptz,
    PRIMARY KEY(chat_id,update_id)
);
