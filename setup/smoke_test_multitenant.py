"""Quick smoke test for StockLens multi-tenant behavior.

Run:
  python3 setup/smoke_test_multitenant.py
"""
import os
import random
import sqlite3
import string
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src', 'core')
sys.path.insert(0, SRC)

from app import create_app  # noqa: E402
from config import DB_PATH  # noqa: E402


def _rand(n=6):
    return ''.join(random.choice(string.ascii_lowercase) for _ in range(n))


def _ok(label, condition):
    status = 'PASS' if condition else 'FAIL'
    print(f'[{status}] {label}')
    if not condition:
        raise AssertionError(label)


def _seed_product(company_id, name):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        """
        INSERT INTO products (company_id, product_name, category, price, is_active)
        VALUES (?, ?, 'Test', 1.0, 1)
        """,
        (company_id, name),
    )
    pid = c.lastrowid
    c.execute(
        """
        INSERT INTO inventory (company_id, product_id, stock_on_hand, last_updated)
        VALUES (?, ?, 10, DATE('now'))
        """,
        (company_id, pid),
    )
    conn.commit()
    conn.close()


def main():
    app = create_app()
    client = app.test_client()

    # Company A founder
    sa = _rand()
    a_email = f'a_{sa}@example.com'
    r = client.post('/api/register', json={'username': f'A {sa}', 'email': a_email, 'password': 'pass123'})
    _ok('register founder A', r.status_code == 200)

    r = client.post('/api/company/create', json={'company_name': f'Company A {sa}', 'industry': 'Grocery'})
    _ok('create company A', r.status_code == 200)
    a_body = r.get_json()
    a_company_id = a_body['company_id']
    invite_code = a_body['invite_code']

    # Company B founder
    client.post('/api/logout')
    sb = _rand()
    b_email = f'b_{sb}@example.com'
    r = client.post('/api/register', json={'username': f'B {sb}', 'email': b_email, 'password': 'pass123'})
    _ok('register founder B', r.status_code == 200)

    r = client.post('/api/company/create', json={'company_name': f'Company B {sb}', 'industry': 'Pharmacy'})
    _ok('create company B', r.status_code == 200)
    b_company_id = r.get_json()['company_id']

    # Seed isolated products
    _seed_product(a_company_id, 'ONLY_A')
    _seed_product(b_company_id, 'ONLY_B')

    # B should only see B
    products_b = client.get('/api/products').get_json()
    b_names = [p['product_name'] for p in products_b]
    _ok('company B only sees ONLY_B', 'ONLY_B' in b_names and 'ONLY_A' not in b_names)

    # Staff join A via invite code
    client.post('/api/logout')
    st = _rand()
    staff_email = f'staff_{st}@example.com'
    r = client.post('/api/register', json={
        'username': f'Staff {st}',
        'email': staff_email,
        'password': 'pass123',
        'invite_code': invite_code,
    })
    _ok('staff register with invite', r.status_code == 200)

    me = client.get('/api/me').get_json()
    _ok('staff assigned to company A', me.get('company_id') == a_company_id)

    # Staff blocked from manager endpoint
    r = client.get('/api/staff/list')
    _ok('staff blocked from /api/staff/list', r.status_code == 403)

    # Back to founder A and run team actions
    client.post('/api/logout')
    r = client.post('/api/login', json={'email': a_email, 'password': 'pass123'})
    _ok('founder A login', r.status_code == 200)

    r = client.get('/api/staff/list')
    _ok('manager can list staff', r.status_code == 200 and isinstance(r.get_json(), list))

    r = client.post('/api/invite/generate')
    _ok('manager can generate invite', r.status_code == 200 and bool(r.get_json().get('code')))
    exp_code = r.get_json().get('code')

    # Force expiry and verify blocked
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE invite_codes SET expires_at = DATETIME('now', '-1 day') WHERE code = ?", (exp_code,))
    conn.commit()
    conn.close()

    client.post('/api/logout')
    ex = _rand()
    expired_email = f'expired_{ex}@example.com'
    r = client.post('/api/register', json={
        'username': f'Expired {ex}',
        'email': expired_email,
        'password': 'pass123',
        'invite_code': exp_code,
    })
    _ok('expired invite rejected', r.status_code == 400)

    # Re-login founder A
    r = client.post('/api/login', json={'email': a_email, 'password': 'pass123'})
    _ok('founder A re-login', r.status_code == 200)

    r = client.post('/api/pipeline/run')
    _ok('manager can run pipeline', r.status_code == 200)

    print('\nSmoke test completed successfully.')


if __name__ == '__main__':
    main()
