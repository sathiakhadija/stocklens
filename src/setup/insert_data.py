import sqlite3
from werkzeug.security import generate_password_hash

conn = sqlite3.connect('db/stocklens.db')
cursor = conn.cursor()

cursor.execute('DELETE FROM sales')
cursor.execute('DELETE FROM inventory')
cursor.execute('DELETE FROM products')
cursor.execute('DELETE FROM users')
cursor.execute('DELETE FROM companies')

cursor.execute(
    "INSERT INTO companies (company_name, industry, description) VALUES (?, ?, ?)",
    ('DEFAULT_COMPANY', 'General Retail', 'Seed tenant'),
)
company_id = cursor.lastrowid

cursor.execute(
    """
    INSERT INTO users (company_id, email, username, password_hash, role, is_active)
    VALUES (?, ?, ?, ?, 'manager', 1)
    """,
    (company_id, 'manager1@stocklens.local', 'manager1', generate_password_hash('pass123')),
)

cursor.execute(
    """
    INSERT INTO users (company_id, email, username, password_hash, role, is_active)
    VALUES (?, ?, ?, ?, 'staff', 1)
    """,
    (company_id, 'staff1@stocklens.local', 'staff1', generate_password_hash('pass123')),
)

cursor.execute(
    "INSERT INTO products (company_id, product_name, category, price) VALUES (?, ?, ?, ?)",
    (company_id, 'Chocolate', 'Snacks', 1.5),
)
p1 = cursor.lastrowid
cursor.execute(
    "INSERT INTO products (company_id, product_name, category, price) VALUES (?, ?, ?, ?)",
    (company_id, 'Cola', 'Drinks', 2.0),
)
p2 = cursor.lastrowid

cursor.execute(
    'INSERT INTO sales (company_id, product_id, date, units_sold) VALUES (?, ?, ?, ?)',
    (company_id, p1, '2024-01-01', 10),
)
cursor.execute(
    'INSERT INTO sales (company_id, product_id, date, units_sold) VALUES (?, ?, ?, ?)',
    (company_id, p1, '2024-01-02', 12),
)
cursor.execute(
    'INSERT INTO sales (company_id, product_id, date, units_sold) VALUES (?, ?, ?, ?)',
    (company_id, p2, '2024-01-01', 5),
)

cursor.execute(
    'INSERT INTO inventory (company_id, product_id, stock_on_hand, last_updated) VALUES (?, ?, ?, ?)',
    (company_id, p1, 25, '2024-01-05'),
)
cursor.execute(
    'INSERT INTO inventory (company_id, product_id, stock_on_hand, last_updated) VALUES (?, ?, ?, ?)',
    (company_id, p2, 40, '2024-01-05'),
)

conn.commit()
conn.close()

print('Data inserted successfully!')
