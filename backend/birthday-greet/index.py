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

def _years_label(years: int) -> str:
    if years % 100 in (11, 12, 13, 14):
        return f'{years} лет'
    if years % 10 == 1:
        return f'{years} год'
    if years % 10 in (2, 3, 4):
        return f'{years} года'
    return f'{years} лет'

ANNIVERSARY_MESSAGES = [
    "🌿 {name} — {years_label} с нами в команде GreenTeam! Спасибо за каждый день, за вклад и за энергию. Вы — часть нашей истории!",
    "⭐ {years_label} в команде — это {name}! Ценим, гордимся и желаем ещё много общих побед впереди!",
    "🚀 Сегодня {name} отмечает {years_label} в GreenTeam! Спасибо, что идёте с нами — вперёд и выше!",
    "💚 {years_label} вместе! {name}, ты — часть нашей команды и нашей силы. Спасибо за всё!",
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
    import hashlib

    try:
        # --- Дни рождения ---
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
            idx = int(hashlib.md5(f'{name}{current_year}'.encode()).hexdigest(), 16) % len(GREETINGS)
            text = GREETINGS[idx].format(name=name)
            ok = False
            if token:
                try:
                    ok = _send_tg(token, channel, text)
                except Exception as e:
                    print(f'tg send error for {name}: {e}')
            with conn.cursor() as cur:
                cur.execute("UPDATE employees SET greeted_year = %s WHERE id = %s", (current_year, emp_id))
            conn.commit()
            sent.append({'name': name, 'tg_sent': ok, 'type': 'birthday'})

        # --- Годовщины работы ---
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, joined_at, anniversary_greeted_year FROM employees "
                "WHERE joined_at IS NOT NULL "
                "AND EXTRACT(MONTH FROM joined_at) = %s AND EXTRACT(DAY FROM joined_at) = %s",
                (today.month, today.day),
            )
            ann_rows = cur.fetchall()

        for emp_id, name, joined_at, ann_greeted_year in ann_rows:
            years = current_year - joined_at.year
            if years < 1:
                continue
            if ann_greeted_year == current_year:
                skipped.append(f'{name} (годовщина)')
                continue
            years_label = _years_label(years)
            idx = int(hashlib.md5(f'{name}_ann_{current_year}'.encode()).hexdigest(), 16) % len(ANNIVERSARY_MESSAGES)
            text = ANNIVERSARY_MESSAGES[idx].format(name=name, years_label=years_label)
            ok = False
            if token:
                try:
                    ok = _send_tg(token, channel, text)
                except Exception as e:
                    print(f'tg anniversary error for {name}: {e}')
            with conn.cursor() as cur:
                cur.execute("UPDATE employees SET anniversary_greeted_year = %s WHERE id = %s", (current_year, emp_id))
            conn.commit()
            sent.append({'name': name, 'tg_sent': ok, 'type': 'anniversary', 'years': years})

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