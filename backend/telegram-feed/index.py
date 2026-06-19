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
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode('utf-8'))


def _save_posts(conn, updates):
    saved = 0
    with conn.cursor() as cur:
        for upd in updates.get('result', []):
            post = upd.get('channel_post')
            if not post:
                continue
            text = post.get('text') or post.get('caption')
            if not text:
                continue
            message_id = post['message_id']
            title = (post.get('chat') or {}).get('title', '')
            posted_at = post.get('date')
            cur.execute(
                "INSERT INTO telegram_posts (message_id, chat_title, text, posted_at) "
                "VALUES (%s, %s, %s, to_timestamp(%s)) ON CONFLICT (message_id) DO NOTHING",
                (message_id, title, text, posted_at),
            )
            saved += cur.rowcount
    conn.commit()
    return saved


def _load_posts(conn, limit=10):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT message_id, chat_title, text, posted_at FROM telegram_posts "
            "ORDER BY posted_at DESC LIMIT %s",
            (limit,),
        )
        rows = cur.fetchall()
    posts = []
    for r in rows:
        posts.append({
            'id': r[0],
            'channel': r[1] or 'Telegram-канал',
            'text': r[2],
            'postedAt': r[3].isoformat() if r[3] else None,
        })
    return posts


def handler(event: dict, context) -> dict:
    '''Читает свежие посты из Telegram-канала и отдаёт их в ленту портала.'''
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors_headers(), 'body': ''}

    token = os.environ.get('TELEGRAM_BOT_TOKEN')
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    try:
        new_count = 0
        if token:
            try:
                updates = _fetch_updates(token)
                new_count = _save_posts(conn, updates)
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
