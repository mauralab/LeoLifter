-- Existing group records and subscriptions are preserved.
ALTER TABLE telegram_chats DROP CONSTRAINT IF EXISTS telegram_chats_chat_type_check;
ALTER TABLE telegram_chats ADD CONSTRAINT telegram_chats_chat_type_check
    CHECK (chat_type IN ('group','supergroup','channel'));
