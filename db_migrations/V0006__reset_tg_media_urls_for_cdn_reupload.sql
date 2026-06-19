UPDATE telegram_posts
SET media_url = NULL, media_file_url = NULL
WHERE media_url LIKE '%api.telegram.org%'
   OR media_file_url LIKE '%api.telegram.org%';