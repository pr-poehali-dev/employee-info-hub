ALTER TABLE telegram_posts
    ADD COLUMN IF NOT EXISTS media_type TEXT,
    ADD COLUMN IF NOT EXISTS media_file_id TEXT,
    ADD COLUMN IF NOT EXISTS media_url TEXT;