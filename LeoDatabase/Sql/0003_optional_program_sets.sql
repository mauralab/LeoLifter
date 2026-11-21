-- Each target row remains one physical set. Extra sets in a range are optional.
ALTER TABLE program_set_exercises ADD COLUMN IF NOT EXISTS is_optional boolean NOT NULL DEFAULT false;
