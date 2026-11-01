-- Additive migration only. Existing users/user_telegram/user_sessions/profile/settings
-- remain owned by the .NET database model and must already exist.
CREATE TABLE IF NOT EXISTS telegram_login_links (
    nonce_hash text PRIMARY KEY,
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_telegram_login_links_expires_at ON telegram_login_links (expires_at);
