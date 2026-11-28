-- Localized program introductions. Full guide pages are intentionally separate future work.
CREATE TABLE IF NOT EXISTS program_descriptions (
 program_id bigint NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
 language_id bigint NOT NULL REFERENCES languages(id) ON DELETE RESTRICT,
 description text NOT NULL DEFAULT '',
 image_url varchar(2048),
 image_alt text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT program_descriptions_pkey PRIMARY KEY(program_id,language_id),
 CONSTRAINT program_description_length_check CHECK(char_length(description)<=20000),
 CONSTRAINT program_description_image_check CHECK(image_url IS NULL OR (image_url=btrim(image_url) AND image_url<>'')),
 CONSTRAINT program_description_alt_check CHECK(char_length(image_alt)<=300)
);
CREATE INDEX IF NOT EXISTS ix_program_descriptions_language_id ON program_descriptions(language_id);
