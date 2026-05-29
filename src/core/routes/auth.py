import hashlib
import secrets

from flask import Blueprint, jsonify, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from database import get_db
from mailer import send_email
from rate_limit import check_rate_limit

auth = Blueprint('auth', __name__)

_RATE_LIMIT_MAX    = 10   # max attempts
_RATE_LIMIT_WINDOW = 300  # 5-minute rolling window


def _client_ip() -> str:
    return request.headers.get('X-Forwarded-For', request.remote_addr or '').split(',')[0].strip()


def _check_rate_limit(scope: str, max_attempts: int = _RATE_LIMIT_MAX) -> bool:
    return check_rate_limit(scope, _client_ip(), max_attempts=max_attempts, window_seconds=_RATE_LIMIT_WINDOW)


def _hash_token(token):
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def _issue_token(conn, table, user_id, hours=24):
    token = secrets.token_urlsafe(32)
    conn.execute(
        f"INSERT INTO {table} (token_hash, user_id, expires_at) VALUES (?, ?, DATETIME('now', ?))",
        (_hash_token(token), user_id, f"+{int(hours)} hours"),
    )
    return token


def _send_reset_email(email, reset_url):
    body = (
        "Use this link to reset your StockLens password. "
        "It expires in 1 hour.\n\n"
        f"{reset_url}\n\n"
        "If you did not request this, ignore this email."
    )
    return send_email(email, "Reset your StockLens password", body)


def _send_verification_email(email, verification_url):
    body = (
        "Verify your StockLens email address with this link. "
        "It expires in 72 hours.\n\n"
        f"{verification_url}\n\n"
        "If you did not create this account, ignore this email."
    )
    return send_email(email, "Verify your StockLens email", body)


def _users_columns(conn):
    c = conn.cursor()
    c.execute("PRAGMA table_info(users)")
    return {row['name'] for row in c.fetchall()}


def _hydrate_session(user_row, conn):
    company_name = None
    if user_row['company_id']:
        c = conn.cursor()
        c.execute(
            'SELECT company_name FROM companies WHERE company_id = ?',
            (user_row['company_id'],),
        )
        row = c.fetchone()
        if row:
            company_name = row['company_name']

    session.permanent = True
    session['user_id'] = user_row['user_id']
    session['username'] = user_row['username']
    session['email'] = user_row['email']
    session['role'] = user_row['role']
    session['company_id'] = user_row['company_id']
    session['company_name'] = company_name


@auth.route('/register', methods=['POST'])
def register():
    if not _check_rate_limit("register", max_attempts=5):
        return jsonify({'message': 'Too many registration attempts. Please wait 5 minutes.'}), 429

    data = request.get_json(silent=True) or {}
    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    invite_code = data.get('invite_code', '').strip().upper()

    if not username or not email or not password:
        return jsonify({'message': 'Username, email, and password are required'}), 400
    if len(password) < 8:
        return jsonify({'message': 'Password must be at least 8 characters'}), 400

    conn = get_db()
    c = conn.cursor()
    user_cols = _users_columns(conn)
    c.execute('SELECT user_id FROM users WHERE email = ?', (email,))
    if c.fetchone():
        conn.close()
        return jsonify({'message': 'Email already registered'}), 409

    final_username = username
    c.execute('SELECT user_id FROM users WHERE username = ?', (final_username,))
    if c.fetchone():
        suffix = 2
        while True:
            candidate = f'{username} {suffix}'
            c.execute('SELECT user_id FROM users WHERE username = ?', (candidate,))
            if not c.fetchone():
                final_username = candidate
                break
            suffix += 1

    company_id = None
    role = 'staff'
    company_name = None
    if invite_code:
        c.execute(
            """
            SELECT i.code, i.company_id, i.used, i.use_count, i.max_uses, i.expires_at, c.company_name
            FROM invite_codes i
            JOIN companies c ON c.company_id = i.company_id
            WHERE i.code = ?
            """,
            (invite_code,),
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
        company_id = invite['company_id']
        company_name = invite['company_name']
        role = 'staff'

    password_hash = generate_password_hash(password)
    if 'password' in user_cols:
        c.execute(
            """
            INSERT INTO users (company_id, email, username, password, password_hash, role, is_active, email_verified)
            VALUES (?, ?, ?, ?, ?, ?, 1, 0)
            """,
            (company_id, email, final_username, '', password_hash, role),
        )
    else:
        c.execute(
            """
            INSERT INTO users (company_id, email, username, password_hash, role, is_active, email_verified)
            VALUES (?, ?, ?, ?, ?, 1, 0)
            """,
            (company_id, email, final_username, password_hash, role),
        )
    user_id = c.lastrowid
    if invite_code:
        c.execute(
            'UPDATE invite_codes SET use_count = use_count + 1, used = CASE WHEN use_count + 1 >= max_uses THEN 1 ELSE 0 END WHERE code = ?',
            (invite_code,),
        )
    verification_token = _issue_token(conn, 'email_verification_tokens', user_id, hours=72)

    c.execute('SELECT * FROM users WHERE user_id = ?', (user_id,))
    user = c.fetchone()
    conn.commit()
    _hydrate_session(user, conn)
    if company_name:
        session['company_name'] = company_name
    verification_url = url_for('pages.verify_email_page', token=verification_token, _external=True)
    email_sent, email_error = _send_verification_email(email, verification_url)
    conn.close()

    return jsonify({
        'message': 'Account created',
        'onboarding_required': user['company_id'] is None,
        'user_id': user_id,
        'username': final_username,
        'email_verification_sent': email_sent,
        'email_verification_url': None if email_sent else verification_url,
        'email_message': None if email_sent else email_error,
    })


@auth.route('/login', methods=['POST'])
def login():
    if not _check_rate_limit("login"):
        return jsonify({'message': 'Too many login attempts. Please wait 5 minutes.'}), 429

    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip().lower()
    username = data.get('username', '').strip()
    password = data.get('password', '')

    identifier = email or username
    if not identifier or not password:
        return jsonify({'message': 'Email (or username) and password required'}), 400

    conn = get_db()
    c = conn.cursor()
    c.execute(
        """
        SELECT * FROM users
        WHERE is_active = 1 AND (email = ? OR username = ?)
        LIMIT 1
        """,
        (identifier, identifier),
    )
    user = c.fetchone()

    if not user:
        conn.close()
        return jsonify({'message': 'Invalid credentials'}), 401

    # Legacy fallback during migration.
    valid = False
    if user['password_hash']:
        valid = check_password_hash(user['password_hash'], password)
    elif 'password' in user.keys() and user['password']:
        valid = user['password'] == password
        if valid:
            c.execute(
                'UPDATE users SET password_hash = ? WHERE user_id = ?',
                (generate_password_hash(password), user['user_id']),
            )
            conn.commit()
            c.execute('SELECT * FROM users WHERE user_id = ?', (user['user_id'],))
            user = c.fetchone()

    if not valid:
        conn.close()
        return jsonify({'message': 'Invalid credentials'}), 401

    _hydrate_session(user, conn)
    conn.close()

    return jsonify({
        'message': 'Login successful',
        'role': user['role'],
        'username': user['username'],
        'email': user['email'],
        'company_id': user['company_id'],
        'company_name': session.get('company_name'),
        'onboarding_required': user['company_id'] is None,
    })


@auth.route('/password/forgot', methods=['POST'])
def forgot_password():
    if not _check_rate_limit("forgot", max_attempts=5):
        return jsonify({'message': 'Too many reset requests. Please wait 5 minutes.'}), 429

    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip().lower()
    if not email:
        return jsonify({'message': 'Email is required'}), 400

    reset_url = None
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT user_id FROM users WHERE email = ? AND is_active = 1", (email,))
    user = c.fetchone()
    if user:
        token = _issue_token(conn, 'password_reset_tokens', user['user_id'], hours=1)
        reset_url = url_for('pages.reset_password_page', token=token, _external=True)
    conn.commit()
    conn.close()

    email_sent = False
    email_error = None
    if user and reset_url:
        email_sent, email_error = _send_reset_email(email, reset_url)

    return jsonify({
        'message': 'If that account exists, a password reset link has been sent.' if email_sent else 'If that account exists, a password reset link has been created. SMTP is not configured, so the local test link is shown.',
        'reset_url': None if email_sent else reset_url,
        'email_sent': email_sent,
        'email_message': None if email_sent else email_error,
    })


@auth.route('/password/reset', methods=['POST'])
def reset_password():
    if not _check_rate_limit("reset", max_attempts=5):
        return jsonify({'message': 'Too many reset attempts. Please wait 5 minutes.'}), 429
    data = request.get_json(silent=True) or {}
    token = data.get('token', '').strip()
    password = data.get('password', '')
    if not token or len(password) < 8:
        return jsonify({'message': 'Valid token and 8+ character password are required'}), 400

    conn = get_db()
    c = conn.cursor()
    c.execute(
        """
        SELECT token_hash, user_id FROM password_reset_tokens
        WHERE token_hash = ? AND used_at IS NULL AND expires_at > DATETIME('now')
        """,
        (_hash_token(token),),
    )
    row = c.fetchone()
    if not row:
        conn.close()
        return jsonify({'message': 'Reset link is invalid or expired'}), 400
    c.execute("UPDATE users SET password_hash = ?, password = '' WHERE user_id = ?", (generate_password_hash(password), row['user_id']))
    c.execute("UPDATE password_reset_tokens SET used_at = DATETIME('now') WHERE token_hash = ?", (row['token_hash'],))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Password reset successful'})


@auth.route('/email/verify', methods=['POST'])
def verify_email():
    data = request.get_json(silent=True) or {}
    token = data.get('token', '').strip()
    if not token:
        return jsonify({'message': 'Verification token is required'}), 400
    conn = get_db()
    c = conn.cursor()
    c.execute(
        """
        SELECT token_hash, user_id FROM email_verification_tokens
        WHERE token_hash = ? AND used_at IS NULL AND expires_at > DATETIME('now')
        """,
        (_hash_token(token),),
    )
    row = c.fetchone()
    if not row:
        conn.close()
        return jsonify({'message': 'Verification link is invalid or expired'}), 400
    c.execute("UPDATE users SET email_verified = 1 WHERE user_id = ?", (row['user_id'],))
    c.execute("UPDATE email_verification_tokens SET used_at = DATETIME('now') WHERE token_hash = ?", (row['token_hash'],))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Email verified'})


@auth.route('/email/resend', methods=['POST'])
def resend_verification():
    if 'user_id' not in session:
        return jsonify({'message': 'Authentication required'}), 401
    if not _check_rate_limit("verify-resend", max_attempts=5):
        return jsonify({'message': 'Too many verification requests. Please wait 5 minutes.'}), 429

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT user_id, email, email_verified FROM users WHERE user_id = ?", (session['user_id'],))
    user = c.fetchone()
    if not user:
        conn.close()
        return jsonify({'message': 'User not found'}), 404
    if user['email_verified']:
        conn.close()
        return jsonify({'message': 'Email is already verified'})
    token = _issue_token(conn, 'email_verification_tokens', user['user_id'], hours=72)
    conn.commit()
    verification_url = url_for('pages.verify_email_page', token=token, _external=True)
    email_sent, email_error = _send_verification_email(user['email'], verification_url)
    conn.close()
    return jsonify({
        'message': 'Verification email sent.' if email_sent else 'Verification link created. SMTP is not configured, so the local test link is shown.',
        'email_sent': email_sent,
        'email_verification_url': None if email_sent else verification_url,
        'email_message': None if email_sent else email_error,
    })


@auth.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out'})


@auth.route('/me')
def me():
    if 'user_id' not in session:
        return jsonify({'authenticated': False}), 401

    return jsonify({
        'authenticated': True,
        'user_id': session['user_id'],
        'username': session['username'],
        'email': session.get('email'),
        'role': session['role'],
        'company_id': session.get('company_id'),
        'company_name': session.get('company_name'),
        'onboarding_required': session.get('company_id') is None,
    })
