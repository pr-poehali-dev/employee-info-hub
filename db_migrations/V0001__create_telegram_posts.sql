CREATE TABLE IF NOT EXISTS telegram_posts (
    id SERIAL PRIMARY KEY,
    message_id BIGINT UNIQUE NOT NULL,
    chat_title TEXT,
    text TEXT NOT NULL,
    posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_telegram_posts_posted_at ON telegram_posts (posted_at DESC);