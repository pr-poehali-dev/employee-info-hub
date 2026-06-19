import json
import os
import urllib.request
import psycopg2


def _cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        'Content-Type': 'application/json',
    }


def _fetch_updates(token: str):
    url = f'https://api.telegram.org/bot{token}/getUpdates?allowed_updates=["channel_post"]&limit=50'
    with urllib.request.urlopen(urllib.request.Request(url), timeout=20) as resp:
        return json.loads(resp.read().decode('utf-8'))


def _get_file_url(token: str, file_id: str) -> str:
    url = f'https://api.telegram.org/bot{token}/getFile?file_id={file_id}'
    with urllib.request.urlopen(urllib.request.Request(url), timeout=10) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    file_path = data.get('result', {}).get('file_path', '')
    if file_path:
        return f'https://api.telegram.org/file/bot{token}/{file_path}'
    return ''


def _extract_media(post: dict, token: str) -> tuple:
    """Возвращает (media_type, file_id, media_url)."""
    # Фото — берём самое большое (последнее в массиве)
    if post.get('photo'):
        photo = post['photo'][-1]
        file_id = photo['file_id']
        url = _get_file_url(token, file_id) if token else ''
        return 'photo', file_id, url

    # Видео
    if post.get('video'):
        video = post['video']
        file_id = video['file_id']
        # Для превью берём thumbnail если есть
        thumb = video.get('thumbnail') or video.get('thumb')
        thumb_url = _get_file_url(token, thumb['file_id']) if (thumb and token) else ''
        return 'video', file_id, thumb_url

    # Анимация (GIF)
    if post.get('animation'):
        anim = post['animation']
        file_id = anim['file_id']
        thumb = anim.get('thumbnail') or anim.get('thumb')
        thumb_url = _get_file_url(token, thumb['file_id']) if (thumb and token) else ''
        return 'animation', file_id, thumb_url

    return None, None, None


def _save_posts(conn, updates, token: str):
    saved = 0
    with conn.cursor() as cur:
        for upd in updates.get('result', []):
            post = upd.get('channel_post')
            if not post:
                continue
            text = post.get('text') or post.get('caption') or ''
            message_id = post['message_id']
            chat_title = (post.get('chat') or {}).get('title', '')
            posted_at = post.get('date')

            media_type, media_file_id, media_url = None, None, None
            try:
                media_type, media_file_id, media_url = _extract_media(post, token)
            except Exception as e:
                print(f'media extract error msg {message_id}: {e}')

            # Пост без текста и без медиа — пропускаем
            if not text and not media_type:
                continue

            cur.execute(
                "INSERT INTO telegram_posts "
                "(message_id, chat_title, text, posted_at, media_type, media_file_id, media_url) "
                "VALUES (%s, %s, %s, to_timestamp(%s), %s, %s, %s) "
                "ON CONFLICT (message_id) DO UPDATE SET "
                "media_type = EXCLUDED.media_type, "
                "media_file_id = EXCLUDED.media_file_id, "
                "media_url = EXCLUDED.media_url",
                (message_id, chat_title, text, posted_at, media_type, media_file_id, media_url),
            )
            saved += cur.rowcount
    conn.commit()
    return saved


def _load_posts(conn, limit=20):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT message_id, chat_title, text, posted_at, media_type, media_url "
            "FROM telegram_posts ORDER BY posted_at DESC LIMIT %s",
            (limit,),
        )
        rows = cur.fetchall()
    posts = []
    for r in rows:
        posts.append({
            'id': r[0],
            'channel': r[1] or 'Telegram-канал',
            'text': r[2] or '',
            'postedAt': r[3].isoformat() if r[3] else None,
            'mediaType': r[4],
            'mediaUrl': r[5],
        })
    return posts


def handler(event: dict, context) -> dict:
    '''Читает свежие посты из Telegram-канала с медиа и отдаёт их в ленту портала.'''
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors_headers(), 'body': ''}

    token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        new_count = 0
        if token:
            try:
                updates = _fetch_updates(token)
                new_count = _save_posts(conn, updates, token)
            except Exception as e:
                print(f'telegram fetch error: {e}')
        posts = _load_posts(conn)
    finally:
        conn.close()

    return {
        'statusCode': 200,
        'headers': _cors_headers(),
        'body': json.dumps({'posts': posts, 'newCount': new_count}, ensure_ascii=False),
    }
