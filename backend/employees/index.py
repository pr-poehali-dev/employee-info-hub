import base64
import json
import os
import uuid
import psycopg2
import boto3


def _cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    }


def _s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def _cdn_url(key: str) -> str:
    project_id = os.environ['AWS_ACCESS_KEY_ID']
    return f'https://cdn.poehali.dev/projects/{project_id}/files/{key}'


def _days_in_company(joined_iso: str) -> int:
    from datetime import date
    joined = date.fromisoformat(joined_iso)
    return (date.today() - joined).days


def handler(event: dict, context) -> dict:
    """CRUD-API для сотрудников: список, добавление, редактирование, удаление, загрузка фото."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': _cors(), 'body': ''}

    path = (event.get('path') or '/').rstrip('/')
    conn = psycopg2.connect(os.environ['DATABASE_URL'])

    try:
        # POST /upload-photo — загрузка фото в S3
        if method == 'POST' and path.endswith('/upload-photo'):
            body = json.loads(event.get('body') or '{}')
            emp_id = body.get('id')
            data_url = body.get('photo', '')
            if not data_url or not emp_id:
                return {'statusCode': 400, 'headers': _cors(), 'body': json.dumps({'error': 'нужны id и photo'})}
            header = ''
            if ',' in data_url:
                header, b64 = data_url.split(',', 1)
            else:
                b64 = data_url
            img_bytes = base64.b64decode(b64)
            ext = 'png' if 'png' in header else 'jpg'
            key = f'employees/{emp_id}_{uuid.uuid4().hex[:8]}.{ext}'
            s3 = _s3()
            s3.put_object(
                Bucket='files', Key=key, Body=img_bytes,
                ContentType=f'image/{ext}', ACL='public-read',
            )
            photo_url = _cdn_url(key)
            with conn.cursor() as cur:
                cur.execute('UPDATE employees SET photo_url = %s WHERE id = %s', (photo_url, emp_id))
            conn.commit()
            return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps({'photoUrl': photo_url})}

        # GET — список сотрудников
        if method == 'GET':
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, name, role, birthday, tg_username, greeted_year, photo_url, email, joined_at, department "
                    "FROM employees ORDER BY name"
                )
                rows = cur.fetchall()
            employees = []
            for r in rows:
                joined_iso = r[8].isoformat() if r[8] else None
                employees.append({
                    'id': r[0], 'name': r[1], 'role': r[2] or '',
                    'birthday': r[3].isoformat() if r[3] else '',
                    'tgUsername': r[4] or '',
                    'greetedYear': r[5],
                    'photoUrl': r[6] or '',
                    'email': r[7] or '',
                    'joinedAt': joined_iso,
                    'daysInCompany': _days_in_company(joined_iso) if joined_iso else None,
                    'department': r[9] or '',
                })
            return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps({'employees': employees}, ensure_ascii=False)}

        # POST — добавить сотрудника
        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            name = body.get('name', '').strip()
            role = body.get('role', '').strip()
            birthday = body.get('birthday', '').strip()
            tg = body.get('tgUsername', '').strip()
            email = body.get('email', '').strip()
            joined_at = body.get('joinedAt', '').strip() or None
            department = body.get('department', '').strip() or None
            if not name or not birthday:
                return {'statusCode': 400, 'headers': _cors(), 'body': json.dumps({'error': 'name и birthday обязательны'})}
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO employees (name, role, birthday, tg_username, email, joined_at, department) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
                    (name, role or None, birthday, tg or None, email or None, joined_at, department),
                )
                new_id = cur.fetchone()[0]
            conn.commit()
            return {'statusCode': 201, 'headers': _cors(), 'body': json.dumps({'id': new_id, 'name': name}, ensure_ascii=False)}

        # PUT — редактировать сотрудника
        if method == 'PUT':
            body = json.loads(event.get('body') or '{}')
            emp_id = body.get('id')
            if not emp_id:
                return {'statusCode': 400, 'headers': _cors(), 'body': json.dumps({'error': 'нужен id'})}
            fields = []
            values = []
            for col, key in [('name', 'name'), ('role', 'role'), ('tg_username', 'tgUsername'), ('email', 'email'), ('joined_at', 'joinedAt'), ('birthday', 'birthday'), ('department', 'department')]:
                if key in body:
                    fields.append(f'{col} = %s')
                    values.append(body[key] or None)
            if not fields:
                return {'statusCode': 400, 'headers': _cors(), 'body': json.dumps({'error': 'нет полей для обновления'})}
            values.append(emp_id)
            with conn.cursor() as cur:
                cur.execute(f"UPDATE employees SET {', '.join(fields)} WHERE id = %s", values)
            conn.commit()
            return {'statusCode': 200, 'headers': _cors(), 'body': json.dumps({'updated': emp_id})}

        # DELETE
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