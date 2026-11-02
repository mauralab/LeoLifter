CREATE TABLE IF NOT EXISTS password_login_requests (
 id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{32}$'),
 user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 browser_token_hash text NOT NULL UNIQUE,
 credential_hash text NOT NULL,
 telegram_id bigint NOT NULL,
 chat_id bigint NOT NULL CHECK (chat_id = telegram_id AND telegram_id > 0),
 locale text NOT NULL,
 device text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied','consumed','failed')),
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 expires_at timestamptz NOT NULL,
 decided_at timestamptz,
 notified_at timestamptz,
 message_id bigint,
 send_attempts integer NOT NULL DEFAULT 0,
 last_send_attempt_at timestamptz
);
CREATE INDEX IF NOT EXISTS ix_password_login_dispatch ON password_login_requests(status, expires_at) WHERE notified_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_password_login_user ON password_login_requests(user_id);
CREATE TABLE IF NOT EXISTS auth_rate_limits (
 key_hash text PRIMARY KEY,
 window_start timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 attempts integer NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_auth_rate_limits_window ON auth_rate_limits(window_start);
