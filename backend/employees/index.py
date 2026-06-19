import json
import os
import psycopg2


def _cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    }


def handler(event: dict, context) -> dict:
    """CRUD-API для управления сотрудниками и их днями рождения."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors(), 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        if method == 'GET':
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, name, role, birthday, tg_username, greeted_year "
                    "FROM employees ORDER BY EXTRACT(MONTH FROM birthday), EXTRACT(DAY FROM birthday)"
                )
                rows = cur.fetchall()
            employees = [
                {
                    'id': r[0], 'name': r[1], 'role': r[2] or '',
                    'birthday': r[3].isoformat() if r[3] else '',
                    'tgUsername': r[4] or '',
                    'greetedYear': r[5],
                }
                for r in rows
            ]
            return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps({'employees': employees}, ensure_ascii=False)}

        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            name = body.get('name', '').strip()
            role = body.get('role', '').strip()
            birthday = body.get('birthday', '').strip()
            tg = body.get('tgUsername', '').strip()
            if not name or not birthday:
                return {'statusCode': 400, 'headers': _cors(), 'body': json.dumps({'error': 'name и birthday обязательны'})}
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO employees (name, role, birthday, tg_username) VALUES (%s, %s, %s, %s) RETURNING id",
                    (name, role or None, birthday, tg or None),
                )
                new_id = cur.fetchone()[0]
            conn.commit()
            return {'statusCode': 201, 'headers': _cors(), 'body': json.dumps({'id': new_id, 'name': name}, ensure_ascii=False)}

        if method == 'DELETE':
            params = event.get('queryStringParameters') or {}
            emp_id = params.get('id')
            if not emp_id:
                return {'statusCode': 400, 'headers': _cors(), 'body': json.dumps({'error': 'нужен параметр id'})}
            with conn.cursor() as cur:
                cur.execute("DELETE FROM employees WHERE id = %s", (int(emp_id),))
            conn.commit()
            return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps({'deleted': int(emp_id)})}

    finally:
        conn.close()

    return {'statusCode': 405, 'headers': _cors(), 'body': json.dumps({'error': 'method not allowed'})}
