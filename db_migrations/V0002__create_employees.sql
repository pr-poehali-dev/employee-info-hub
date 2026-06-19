CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    birthday DATE NOT NULL,
    tg_username TEXT,
    greeted_year INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO employees (name, role, birthday, tg_username) VALUES
    ('Анна Белова', 'Дизайнер', '1995-06-19', '@anna_b'),
    ('Игорь Сомов', 'Backend', '1992-06-28', '@igor_dev'),
    ('Мария Кац', 'HR Lead', '1990-08-14', '@maria_hr'),
    ('Олег Ринат', 'Маркетолог', '1994-11-03', '@oleg_mk')
ON CONFLICT DO NOTHING;