import secrets
import string

from flask import Blueprint, jsonify, request, session

from auth_utils import login_required, manager_required
from database import get_db

onboarding = Blueprint('onboarding', __name__)


def _new_invite_code(length=6):
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def _issue_invite_code(conn, company_id, created_by, expires_in_days=14, max_uses=1):
    c = conn.cursor()
    expires_clause = None
    if expires_in_days is not None:
        expires_in_days = max(1, min(365, int(expires_in_days)))
        expires_clause = f"+{expires_in_days} days"

    for _ in range(20):
        code = _new_invite_code()
        c.execute('SELECT code FROM invite_codes WHERE code = ?', (code,))
        if not c.fetchone():
            c.execute(
                """
                INSERT INTO invite_codes (code, company_id, created_by, used, use_count, max_uses, expires_at)
                VALUES (?, ?, ?, 0, 0, ?, CASE WHEN ? IS NULL THEN NULL ELSE DATETIME('now', ?) END)
                """,
                (code, company_id, created_by, max(1, min(500, int(max_uses or 1))), expires_clause, expires_clause),
            )
            return code
    raise RuntimeError('Unable to generate unique invite code')


@onboarding.route('/company/create', methods=['POST'])
@login_required
def create_company():
    if session.get('company_id'):
        return jsonify({'message': 'User already belongs to a company'}), 400

    data = request.get_json(silent=True) or {}
    company_name = data.get('company_name', '').strip()
    industry = data.get('industry', '').strip() or None
    description = data.get('description', '').strip() or None

    if not company_name:
        return jsonify({'message': 'Company name is required'}), 400

    conn = get_db()
    c = conn.cursor()
    c.execute(
        'INSERT INTO companies (company_name, industry, description) VALUES (?, ?, ?)',
        (company_name, industry, description),
    )
    company_id = c.lastrowid

    c.execute(
        """
        UPDATE users
        SET company_id = ?, role = 'manager'
        WHERE user_id = ?
        """,
        (company_id, session['user_id']),
    )

    invite_code = _issue_invite_code(conn, company_id, session['user_id'], expires_in_days=14, max_uses=10)
    conn.commit()
    conn.close()

    session['company_id'] = company_id
    session['company_name'] = company_name
    session['role'] = 'manager'

    return jsonify({
        'message': 'Company created successfully',
        'company_id': company_id,
        'company_name': company_name,
        'invite_code': invite_code,
        'role': 'manager',
    })


@onboarding.route('/invite/generate', methods=['POST'])
@manager_required
def generate_invite():
    company_id = session.get('company_id')
    if not company_id:
        return jsonify({'message': 'Complete onboarding first'}), 400

    body = request.get_json(silent=True) or {}
    expires_in_days = body.get('expires_in_days', 14)
    max_uses = body.get('max_uses', 10)
    if expires_in_days is None:
        expires_in_days = 14

    conn = get_db()
    code = _issue_invite_code(conn, company_id, session['user_id'], expires_in_days=expires_in_days, max_uses=max_uses)
    c = conn.cursor()
    c.execute("SELECT expires_at, max_uses FROM invite_codes WHERE code = ?", (code,))
    row = c.fetchone()
    expires_at = row['expires_at']
    max_uses = row['max_uses']
    conn.commit()
    conn.close()

    return jsonify({'code': code, 'company_id': company_id, 'expires_at': expires_at, 'max_uses': max_uses})


@onboarding.route('/invite/join', methods=['POST'])
@login_required
def join_with_invite():
    if session.get('company_id'):
        return jsonify({'message': 'User already belongs to a company'}), 400

    data = request.get_json(silent=True) or {}
    code = data.get('code', '').strip().upper()
    if not code:
        return jsonify({'message': 'Invite code is required'}), 400

    conn = get_db()
    c = conn.cursor()
    c.execute(
        """
        SELECT i.code, i.company_id, i.used, i.use_count, i.max_uses, i.expires_at, c.company_name
        FROM invite_codes i
        JOIN companies c ON i.company_id = c.company_id
        WHERE i.code = ?
        """,
        (code,),
    )
    invite = c.fetchone()

    if not invite:
        conn.close()
        return jsonify({'message': 'Invalid invite code'}), 404

    if invite['used'] or int(invite['use_count'] or 0) >= int(invite['max_uses'] or 1):
        conn.close()
        return jsonify({'message': 'Invite code already used'}), 400
    if invite['expires_at']:
        c.execute(
            "SELECT CASE WHEN ? <= DATETIME('now') THEN 1 ELSE 0 END AS expired",
            (invite['expires_at'],),
        )
        if c.fetchone()['expired']:
            conn.close()
            return jsonify({'message': 'Invite code expired'}), 400

    c.execute(
        """
        UPDATE users
        SET company_id = ?, role = 'staff'
        WHERE user_id = ?
        """,
        (invite['company_id'], session['user_id']),
    )
    c.execute(
        'UPDATE invite_codes SET use_count = use_count + 1, used = CASE WHEN use_count + 1 >= max_uses THEN 1 ELSE 0 END WHERE code = ?',
        (code,),
    )
    conn.commit()
    conn.close()

    session['company_id'] = invite['company_id']
    session['company_name'] = invite['company_name']
    session['role'] = 'staff'

    return jsonify({
        'message': 'Joined company successfully',
        'company_id': invite['company_id'],
        'company_name': invite['company_name'],
        'role': 'staff',
    })
