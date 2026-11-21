-- Additive editor metadata. Training data remains in the existing normalized tables.
CREATE TABLE IF NOT EXISTS program_editor_layouts (
 program_id bigint PRIMARY KEY REFERENCES programs(id) ON DELETE CASCADE,
 document jsonb NOT NULL DEFAULT '{"nodes":[]}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now()
);
