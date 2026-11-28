-- Opaque pre-registration credentials. Store only the SHA-256 code hash.
CREATE TABLE IF NOT EXISTS telegram_signin_links (
    code_hash text PRIMARY KEY CHECK (code_hash ~ '^[A-F0-9]{64}$'),
    telegram_id bigint NOT NULL CHECK (telegram_id > 0),
    chat_id bigint NOT NULL CHECK (chat_id = telegram_id),
    telegram_username varchar(32) NOT NULL DEFAULT '' CHECK (telegram_username ~ '^[A-Za-z0-9_]{0,32}$'),
    locale varchar(2) NOT NULL CHECK (locale IN ('en', 'uk', 'nb', 'de', 'pl')),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS ix_telegram_signin_links_expires_at ON telegram_signin_links (expires_at);
