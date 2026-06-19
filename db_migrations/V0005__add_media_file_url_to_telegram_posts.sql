ALTER TABLE telegram_posts
    ADD COLUMN IF NOT EXISTS media_file_url TEXT,
    ADD COLUMN IF NOT EXISTS media_group_id TEXT;