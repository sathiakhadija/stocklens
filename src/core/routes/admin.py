import json

from flask import Blueprint, Response, jsonify, request, session

from auth_utils import manager_required
from database import get_db

admin = Blueprint('admin', __name__)


@admin.route('/staff/list')
@manager_required
def list_staff():
    company_id = session.get('company_id')
    if not company_id:
        return jsonify({'message': 'Complete onboarding first'}), 400

    conn = get_db()
    c = conn.cursor()
    c.execute(
        """
        SELECT user_id, username, email, role, is_active, created_at, email_verified
        FROM users
        WHERE company_id = ?
        ORDER BY CASE role WHEN 'manager' THEN 0 ELSE 1 END, username
        """,
        (company_id,),
    )
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)


@admin.route('/staff/remove', methods=['POST'])
@manager_required
def remove_staff():
    company_id = session.get('company_id')
    if not company_id:
        return jsonify({'message': 'Complete onboarding first'}), 400
    target_id = int((request.get_json(silent=True) or {}).get('user_id', 0))

    if not target_id:
        return jsonify({'message': 'user_id is required'}), 400
    if target_id == session['user_id']:
        return jsonify({'message': 'You cannot remove yourself'}), 400

    conn = get_db()
    c = conn.cursor()
    c.execute(
        'SELECT user_id, role FROM users WHERE user_id = ? AND company_id = ?',
        (target_id, company_id),
    )
    user = c.fetchone()
    if not user:
        conn.close()
        return jsonify({'message': 'User not found'}), 404

    if user['role'] == 'manager':
        conn.close()
        return jsonify({'message': 'Use role change before removing a manager'}), 400

    c.execute(
        'UPDATE users SET is_active = 0 WHERE user_id = ? AND company_id = ?',
        (target_id, company_id),
    )
    if c.rowcount == 0:
        conn.close()
        return jsonify({'message': 'User not found'}), 404
    conn.commit()
    conn.close()
    return jsonify({'message': 'User deactivated'})


@admin.route('/staff/role', methods=['POST'])
@manager_required
def change_role():
    body = request.get_json(silent=True) or {}
    company_id = session.get('company_id')
    if not company_id:
        return jsonify({'message': 'Complete onboarding first'}), 400

    target_id = int(body.get('user_id', 0))
    role = (body.get('role', '') or '').strip().lower()

    if not target_id or role not in ('manager', 'staff'):
        return jsonify({'message': 'Valid user_id and role are required'}), 400
    if target_id == session['user_id'] and role != 'manager':
        return jsonify({'message': 'At least one manager is required'}), 400

    conn = get_db()
    c = conn.cursor()
    c.execute(
        'SELECT user_id, role FROM users WHERE user_id = ? AND company_id = ?',
        (target_id, company_id),
    )
    user = c.fetchone()
    if not user:
        conn.close()
        return jsonify({'message': 'User not found'}), 404

    if user['role'] == 'manager' and role == 'staff':
        c.execute(
            """
            SELECT COUNT(*) AS n
            FROM users
            WHERE company_id = ? AND role = 'manager' AND is_active = 1
            """,
            (company_id,),
        )
        if c.fetchone()['n'] <= 1:
            conn.close()
            return jsonify({'message': 'At least one active manager is required'}), 400

    c.execute(
        'UPDATE users SET role = ? WHERE user_id = ? AND company_id = ?',
        (role, target_id, company_id),
    )
    if c.rowcount == 0:
        conn.close()
        return jsonify({'message': 'User not found'}), 404
    conn.commit()
    conn.close()

    return jsonify({'message': 'Role updated', 'user_id': target_id, 'role': role})


@admin.route('/company/settings', methods=['GET', 'POST'])
@manager_required
def company_settings():
    company_id = session.get('company_id')
    if not company_id:
        return jsonify({'message': 'Complete onboarding first'}), 400
    conn = get_db()
    c = conn.cursor()
    if request.method == 'POST':
        body = request.get_json(silent=True) or {}
        currency_symbol = (body.get('currency_symbol') or '£').strip()[:4] or '£'
        c.execute(
            "UPDATE companies SET currency_symbol = ? WHERE company_id = ?",
            (currency_symbol, company_id),
        )
        conn.commit()
    c.execute("SELECT company_id, company_name, industry, description, currency_symbol FROM companies WHERE company_id = ?", (company_id,))
    row = c.fetchone()
    conn.close()
    return jsonify(dict(row) if row else {})


@admin.route('/company/export')
@manager_required
def export_company_data():
    company_id = session.get('company_id')
    if not company_id:
        return jsonify({'message': 'Complete onboarding first'}), 400
    tables = [
        'companies', 'users', 'products', 'sales', 'inventory', 'forecast',
        'decisions', 'evaluation', 'reorder_log', 'upload_log',
        'product_classification', 'scenario_results',
    ]
    payload = {}
    conn = get_db()
    c = conn.cursor()
    for table in tables:
        try:
            if table == 'companies':
                c.execute("SELECT * FROM companies WHERE company_id = ?", (company_id,))
            elif table == 'users':
                c.execute("SELECT user_id, company_id, email, username, role, is_active, created_at, email_verified FROM users WHERE company_id = ?", (company_id,))
            else:
                c.execute(f"SELECT * FROM {table} WHERE company_id = ?", (company_id,))
            payload[table] = [dict(r) for r in c.fetchall()]
        except Exception:
            payload[table] = []
    conn.close()
    return Response(
        json.dumps(payload, indent=2, default=str),
        mimetype='application/json',
        headers={'Content-Disposition': 'attachment; filename=stocklens_company_export.json'},
    )


@admin.route('/company/delete', methods=['POST'])
@manager_required
def delete_company_data():
    company_id = session.get('company_id')
    if not company_id:
        return jsonify({'message': 'Complete onboarding first'}), 400
    body = request.get_json(silent=True) or {}
    if body.get('confirm') != 'DELETE':
        return jsonify({'message': 'Type DELETE to confirm company deletion'}), 400

    conn = get_db()
    c = conn.cursor()
    for table in [
        'pipeline_jobs', 'scenario_results', 'product_classification', 'reorder_log',
        'upload_log', 'evaluation', 'decisions', 'forecast', 'inventory', 'sales',
        'products', 'invite_codes',
    ]:
        try:
            c.execute(f"DELETE FROM {table} WHERE company_id = ?", (company_id,))
        except Exception:
            pass
    c.execute("UPDATE users SET company_id = NULL, role = 'staff' WHERE company_id = ?", (company_id,))
    c.execute("DELETE FROM companies WHERE company_id = ?", (company_id,))
    conn.commit()
    conn.close()
    session.clear()
    return jsonify({'message': 'Company data deleted'})


@admin.route('/account/export')
def export_account_data():
    if 'user_id' not in session:
        return jsonify({'message': 'Authentication required'}), 401
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT user_id, company_id, email, username, role, is_active, created_at, email_verified FROM users WHERE user_id = ?", (session['user_id'],))
    row = c.fetchone()
    conn.close()
    return jsonify(dict(row) if row else {})


@admin.route('/account/delete', methods=['POST'])
def delete_account():
    if 'user_id' not in session:
        return jsonify({'message': 'Authentication required'}), 401
    body = request.get_json(silent=True) or {}
    if body.get('confirm') != 'DELETE':
        return jsonify({'message': 'Type DELETE to confirm account deletion'}), 400

    user_id = session['user_id']
    company_id = session.get('company_id')
    conn = get_db()
    c = conn.cursor()
    if company_id and session.get('role') == 'manager':
        c.execute(
            "SELECT COUNT(*) AS n FROM users WHERE company_id = ? AND role = 'manager' AND is_active = 1 AND user_id != ?",
            (company_id, user_id),
        )
        if c.fetchone()['n'] == 0:
            conn.close()
            return jsonify({'message': 'Transfer manager access or delete the company before deleting the last manager account'}), 400
    c.execute("UPDATE users SET is_active = 0, email = email || '.deleted.' || user_id, username = 'Deleted User ' || user_id WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
    session.clear()
    return jsonify({'message': 'Account deleted'})
