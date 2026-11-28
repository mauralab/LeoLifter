-- Web editor metadata; result rows remain in the existing workout tables.
CREATE TABLE IF NOT EXISTS workout_editor_documents (
 workout_id bigint PRIMARY KEY REFERENCES workouts(id) ON DELETE CASCADE,
 client_key uuid NOT NULL UNIQUE,
 revision uuid NOT NULL,
 document jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
