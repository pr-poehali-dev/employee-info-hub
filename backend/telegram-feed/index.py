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
    url = f'https://api.telegram.org/bot{token}/getUpdates?allowed_updates=["channel_post"]&limit=100'
    with urllib.request.urlopen(urllib.request.Request(url), timeout=20) as resp:
        return json.loads(resp.read().decode('utf-8'))


def _get_file_url(token: str, file_id: str) -> str:
    """Получить прямую ссылку на файл через getFile."""
    url = f'https://api.telegram.org/bot{token}/getFile?file_id={file_id}'
    with urllib.request.urlopen(urllib.request.Request(url), timeout=10) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    file_path = data.get('result', {}).get('file_path', '')
    if file_path:
        return f'https://api.telegram.org/file/bot{token}/{file_path}'
    return ''


def _extract_media(post: dict, token: str) -> dict:
    """
    Возвращает dict с ключами:
      media_type, media_file_id,
      media_url   — превью/картинка для отображения,
      media_file_url — прямая ссылка на сам файл (видео/gif/фото)
    """
    result = {'media_type': None, 'media_file_id': None, 'media_url': None, 'media_file_url': None}

    # Фото
    if post.get('photo'):
        photo = post['photo'][-1]
        file_id = photo['file_id']
        url = _get_file_url(token, file_id) if token else ''
        result.update({'media_type': 'photo', 'media_file_id': file_id, 'media_url': url, 'media_file_url': url})
        return result

    # Видео
    if post.get('video'):
        video = post['video']
        file_id = video['file_id']
        file_url = _get_file_url(token, file_id) if token else ''
        thumb = video.get('thumbnail') or video.get('thumb')
        thumb_url = _get_file_url(token, thumb['file_id']) if (thumb and token) else ''
        result.update({'media_type': 'video', 'media_file_id': file_id, 'media_url': thumb_url, 'media_file_url': file_url})
        return result

    # Анимация (GIF/MP4)
    if post.get('animation'):
        anim = post['animation']
        file_id = anim['file_id']
        file_url = _get_file_url(token, file_id) if token else ''
        thumb = anim.get('thumbnail') or anim.get('thumb')
        thumb_url = _get_file_url(token, thumb['file_id']) if (thumb and token) else ''
        result.update({'media_type': 'animation', 'media_file_id': file_id, 'media_url': thumb_url or file_url, 'media_file_url': file_url})
        return result

    # Голосовое / аудио — только иконка, без превью
    if post.get('voice'):
        file_id = post['voice']['file_id']
        file_url = _get_file_url(token, file_id) if token else ''
        result.update({'media_type': 'voice', 'media_file_id': file_id, 'media_url': None, 'media_file_url': file_url})
        return result

    # Документ / стикер
    if post.get('document'):
        doc = post['document']
        file_id = doc['file_id']
        file_url = _get_file_url(token, file_id) if token else ''
        thumb = doc.get('thumbnail') or doc.get('thumb')
        thumb_url = _get_file_url(token, thumb['file_id']) if (thumb and token) else ''
        result.update({'media_type': 'document', 'media_file_id': file_id, 'media_url': thumb_url, 'media_file_url': file_url})
        return result

    if post.get('sticker'):
        sticker = post['sticker']
        file_id = sticker['file_id']
        thumb = sticker.get('thumbnail') or sticker.get('thumb')
        thumb_url = _get_file_url(token, thumb['file_id']) if (thumb and token) else ''
        result.update({'media_type': 'sticker', 'media_file_id': file_id, 'media_url': thumb_url, 'media_file_url': None})
        return result

    return result


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
            media_group_id = post.get('media_group_id')

            media = {}
            try:
                media = _extract_media(post, token)
            except Exception as e:
                print(f'media extract error msg {message_id}: {e}')

            # Пропускаем только совсем пустые посты
            if not text and not media.get('media_type'):
                continue

            cur.execute(
                "INSERT INTO telegram_posts "
                "(message_id, chat_title, text, posted_at, media_type, media_file_id, media_url, media_file_url, media_group_id) "
                "VALUES (%s, %s, %s, to_timestamp(%s), %s, %s, %s, %s, %s) "
                "ON CONFLICT (message_id) DO UPDATE SET "
                "text = EXCLUDED.text, "
                "media_type = EXCLUDED.media_type, "
                "media_file_id = EXCLUDED.media_file_id, "
                "media_url = EXCLUDED.media_url, "
                "media_file_url = EXCLUDED.media_file_url, "
                "media_group_id = EXCLUDED.media_group_id",
                (
                    message_id, chat_title, text, posted_at,
                    media.get('media_type'), media.get('media_file_id'),
                    media.get('media_url'), media.get('media_file_url'),
                    media_group_id,
                ),
            )
            saved += cur.rowcount
    conn.commit()
    return saved


def _load_posts(conn, limit=30):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT message_id, chat_title, text, posted_at, media_type, media_url, media_file_url, media_group_id "
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
            'mediaFileUrl': r[6],
            'mediaGroupId': r[7],
        })
    return posts


def handler(event: dict, context) -> dict:
    '''Читает все посты из Telegram-канала: текст, фото, видео, GIF, документы.'''
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
