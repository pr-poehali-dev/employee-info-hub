import json
import os
import urllib.request
import urllib.parse
import psycopg2
from datetime import date

GREETINGS = [
    "🎉 Сегодня день рождения у {name}! Поздравляем — желаем море энергии, крутых проектов и отличного настроения!",
    "🥳 {name}, с днём рождения! Спасибо, что делаешь нашу команду лучше каждый день. Пусть всё задуманное сбывается!",
    "🎂 Команда поздравляет {name} с днём рождения! Желаем вдохновения, больших побед и только хороших новостей!",
    "🚀 {name}, с днём рождения от всей команды! Пусть этот год будет самым продуктивным и радостным.",
]


def _cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }


def _send_tg(token: str, chat_id: str, text: str) -> bool:
    payload = json.dumps({'chat_id': chat_id, 'text': text, 'parse_mode': 'HTML'}).encode()
    req = urllib.request.Request(
        f'https://api.telegram.org/bot{token}/sendMessage',
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        result = json.loads(resp.read())
        return result.get('ok', False)


def handler(event: dict, context) -> dict:
    """Проверяет дни рождения сотрудников и отправляет поздравления в Telegram-канал."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors(), 'body': ''}

    token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
    channel = '@moeGT22'
    today = date.today()
    current_year = today.year

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    sent = []
    skipped = []

    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, birthday, greeted_year FROM employees "
                "WHERE EXTRACT(MONTH FROM birthday) = %s AND EXTRACT(DAY FROM birthday) = %s",
                (today.month, today.day),
            )
            rows = cur.fetchall()

        for emp_id, name, birthday, greeted_year in rows:
            if greeted_year == current_year:
                skipped.append(name)
                continue

            import hashlib
            idx = int(hashlib.md5(f'{name}{current_year}'.encode()).hexdigest(), 16) % len(GREETINGS)
            text = GREETINGS[idx].format(name=name)

            ok = False
            if token:
                try:
                    ok = _send_tg(token, channel, text)
                except Exception as e:
                    print(f'tg send error for {name}: {e}')

            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE employees SET greeted_year = %s WHERE id = %s",
                    (current_year, emp_id),
                )
            conn.commit()
            sent.append({'name': name, 'tg_sent': ok})

    finally:
        conn.close()

    return {
        'statusCode': 200,
        'headers': {**_cors(), 'Content-Type': 'application/json'},
        'body': json.dumps({
            'date': today.isoformat(),
            'sent': sent,
            'skipped': skipped,
        }, ensure_ascii=False),
    }
