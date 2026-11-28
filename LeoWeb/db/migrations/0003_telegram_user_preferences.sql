-- Preferences exist before web registration; deliberately no users FK.
CREATE TABLE IF NOT EXISTS telegram_user_preferences (
    telegram_id bigint PRIMARY KEY CHECK (telegram_id > 0),
    language_id bigint NOT NULL REFERENCES languages(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_telegram_user_preferences_language_id
    ON telegram_user_preferences (language_id);
