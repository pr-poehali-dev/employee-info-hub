import json
import os
import urllib.request
import psycopg2
import boto3


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


def _get_tg_file_path(token: str, file_id: str) -> str:
    url = f'https://api.telegram.org/bot{token}/getFile?file_id={file_id}'
    with urllib.request.urlopen(urllib.request.Request(url), timeout=10) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    return data.get('result', {}).get('file_path', '')


def _upload_to_cdn(token: str, file_id: str, s3, project_id: str) -> str:
    """Скачиваем файл из TG и кладём в S3, возвращаем CDN-ссылку."""
    file_path = _get_tg_file_path(token, file_id)
    if not file_path:
        return ''
    tg_url = f'https://api.telegram.org/file/bot{token}/{file_path}'
    with urllib.request.urlopen(urllib.request.Request(tg_url), timeout=15) as resp:
        data = resp.read()
    ext = file_path.rsplit('.', 1)[-1] if '.' in file_path else 'bin'
    key = f'tgmedia/{file_id[:24]}.{ext}'
    content_types = {
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
        'mp4': 'video/mp4', 'webm': 'video/webm', 'gif': 'image/gif',
        'ogg': 'audio/ogg', 'mp3': 'audio/mpeg', 'webp': 'image/webp',
    }
    ct = content_types.get(ext.lower(), 'application/octet-stream')
    s3.put_object(Bucket='files', Key=key, Body=data, ContentType=ct, ACL='public-read')
    return f'https://cdn.poehali.dev/projects/{project_id}/files/{key}'


def _s3_client():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def _extract_and_upload(post: dict, token: str, s3, project_id: str) -> dict:
    """Скачивает медиа из Telegram и загружает на CDN. Возвращает dict с url."""
    result = {'media_type': None, 'media_file_id': None, 'media_url': None, 'media_file_url': None}

    if post.get('photo'):
        photo = post['photo'][-1]
        file_id = photo['file_id']
        cdn = _upload_to_cdn(token, file_id, s3, project_id)
        result.update({'media_type': 'photo', 'media_file_id': file_id, 'media_url': cdn, 'media_file_url': cdn})
        return result

    if post.get('video'):
        video = post['video']
        file_id = video['file_id']
        file_cdn = _upload_to_cdn(token, file_id, s3, project_id)
        thumb = video.get('thumbnail') or video.get('thumb')
        thumb_cdn = _upload_to_cdn(token, thumb['file_id'], s3, project_id) if thumb else ''
        result.update({'media_type': 'video', 'media_file_id': file_id, 'media_url': thumb_cdn, 'media_file_url': file_cdn})
        return result

    if post.get('animation'):
        anim = post['animation']
        file_id = anim['file_id']
        file_cdn = _upload_to_cdn(token, file_id, s3, project_id)
        thumb = anim.get('thumbnail') or anim.get('thumb')
        thumb_cdn = _upload_to_cdn(token, thumb['file_id'], s3, project_id) if thumb else ''
        result.update({'media_type': 'animation', 'media_file_id': file_id, 'media_url': thumb_cdn or file_cdn, 'media_file_url': file_cdn})
        return result

    if post.get('voice'):
        file_id = post['voice']['file_id']
        file_cdn = _upload_to_cdn(token, file_id, s3, project_id)
        result.update({'media_type': 'voice', 'media_file_id': file_id, 'media_url': None, 'media_file_url': file_cdn})
        return result

    if post.get('document'):
        doc = post['document']
        file_id = doc['file_id']
        file_cdn = _upload_to_cdn(token, file_id, s3, project_id)
        thumb = doc.get('thumbnail') or doc.get('thumb')
        thumb_cdn = _upload_to_cdn(token, thumb['file_id'], s3, project_id) if thumb else ''
        result.update({'media_type': 'document', 'media_file_id': file_id, 'media_url': thumb_cdn, 'media_file_url': file_cdn})
        return result

    if post.get('sticker'):
        sticker = post['sticker']
        file_id = sticker['file_id']
        thumb = sticker.get('thumbnail') or sticker.get('thumb')
        thumb_cdn = _upload_to_cdn(token, thumb['file_id'], s3, project_id) if thumb else ''
        result.update({'media_type': 'sticker', 'media_file_id': file_id, 'media_url': thumb_cdn, 'media_file_url': None})
        return result

    return result


def _save_posts(conn, updates, token: str):
    saved = 0
    s3 = _s3_client()
    project_id = os.environ['AWS_ACCESS_KEY_ID']

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

            # Уже залито на CDN — пропускаем повторную загрузку
            cur.execute("SELECT media_url FROM telegram_posts WHERE message_id = %s", (message_id,))
            existing = cur.fetchone()
            if existing and existing[0] and 'cdn.poehali.dev' in existing[0]:
                continue

            media = {}
            try:
                media = _extract_and_upload(post, token, s3, project_id)
            except Exception as e:
                print(f'media upload error msg {message_id}: {e}')

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


def _reupload_missing(conn, token: str, limit: int = 1) -> int:
    """Перезаливает медиа для постов у которых media_file_id есть, но media_url пустой.
    Обрабатывает limit штук за раз чтобы не упираться в таймаут функции."""
    s3 = _s3_client()
    project_id = os.environ['AWS_ACCESS_KEY_ID']
    fixed = 0
    with conn.cursor() as cur:
        cur.execute(
            "SELECT message_id, media_type, media_file_id FROM telegram_posts "
            "WHERE media_file_id IS NOT NULL AND (media_url IS NULL OR media_url = '') "
            "ORDER BY posted_at DESC LIMIT %s",
            (limit,),
        )
        rows = cur.fetchall()
        for message_id, media_type, file_id in rows:
            try:
                cdn = _upload_to_cdn(token, file_id, s3, project_id)
                if cdn:
                    cur.execute(
                        "UPDATE telegram_posts SET media_url = %s, media_file_url = %s WHERE message_id = %s",
                        (cdn, cdn, message_id),
                    )
                    fixed += 1
                    print(f'reupload ok: msg {message_id} -> {cdn}')
            except Exception as e:
                print(f'reupload error msg {message_id}: {e}')
    conn.commit()
    return fixed


def handler(event: dict, context) -> dict:
    '''Читает посты из Telegram-канала, загружает медиа на CDN и отдаёт в ленту.'''
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors_headers(), 'body': ''}

    token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
    path = (event.get('path') or '/').rstrip('/')
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        params = event.get('queryStringParameters') or {}

        # POST ?action=reupload — перезалить медиа по одному посту за вызов
        if method == 'POST' and params.get('action') == 'reupload':
            fixed = 0
            if token:
                fixed = _reupload_missing(conn, token)
            posts = _load_posts(conn)
            return {
                'statusCode': 200,
                'headers': _cors_headers(),
                'body': json.dumps({'fixed': fixed, 'posts': posts}, ensure_ascii=False),
            }

        # GET — только читаем из базы, быстро
        posts = _load_posts(conn)
    finally:
        conn.close()

    return {
        'statusCode': 200,
        'headers': _cors_headers(),
        'body': json.dumps({'posts': posts, 'newCount': 0}, ensure_ascii=False),
    }