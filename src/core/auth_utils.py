from functools import wraps

from flask import jsonify, redirect, request, session, url_for


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            if request.path.startswith('/api'):
                return jsonify({'message': 'Authentication required'}), 401
            return redirect(url_for('pages.login'))
        return f(*args, **kwargs)

    return decorated


def manager_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'message': 'Authentication required'}), 401
        if session.get('role') != 'manager':
            return jsonify({'message': 'Manager access required'}), 403
        return f(*args, **kwargs)

    return decorated


def api_login_required():
    if 'user_id' not in session:
        return jsonify({'message': 'Authentication required'}), 401
    return None


def api_manager_only():
    check = api_login_required()
    if check:
        return check
    if session.get('role') != 'manager':
        return jsonify({'message': 'Manager access required'}), 403
    return None


def require_company():
    company_id = session.get('company_id')
    if not company_id:
        return None, (jsonify({'message': 'Complete onboarding first'}), 400)
    return company_id, None
