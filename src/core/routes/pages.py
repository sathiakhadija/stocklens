from flask import Blueprint, redirect, render_template, session, url_for

from auth_utils import login_required

pages = Blueprint('pages', __name__)


def _is_logged_in():
    return 'user_id' in session


def _has_company():
    return bool(session.get('company_id'))


@pages.route('/')
def homepage():
    if not _is_logged_in():
        return render_template('homepage.html')
    return redirect(url_for('pages.dashboard'))


@pages.route('/login')
def login():
    if _is_logged_in():
        return redirect(url_for('pages.dashboard'))
    return render_template('login.html')


@pages.route('/register')
def register():
    if _is_logged_in():
        return redirect(url_for('pages.dashboard'))
    return render_template('register.html')


@pages.route('/forgot-password')
def forgot_password():
    if _is_logged_in():
        return redirect(url_for('pages.dashboard'))
    return render_template('forgot_password.html')


@pages.route('/reset-password/<token>')
def reset_password_page(token):
    if _is_logged_in():
        return redirect(url_for('pages.dashboard'))
    return render_template('reset_password.html', token=token)


@pages.route('/verify-email/<token>')
def verify_email_page(token):
    return render_template('verify_email.html', token=token)


@pages.route('/privacy')
def privacy():
    return render_template('legal.html', page_title='Privacy', body='StockLens stores account, company, product, inventory, sales, forecast, and reorder data only to provide the inventory decision dashboard. Do not upload sensitive personal data in sales files. For deletion or export requests, contact the project owner or system administrator.')


@pages.route('/terms')
def terms():
    return render_template('legal.html', page_title='Terms', body='StockLens is a decision-support tool. Forecasts and reorder recommendations are informational and should be reviewed by a manager before purchasing stock. Demo data and dissertation builds are not a substitute for professional operational or accounting advice.')


@pages.route('/contact')
def contact():
    return render_template('legal.html', page_title='Contact', body='For support, password recovery, data export, or account deletion requests, contact your StockLens manager or the project administrator who deployed this instance.')


@pages.route('/onboarding')
@login_required
def onboarding():
    if _has_company():
        return redirect(url_for('pages.dashboard'))
    return render_template(
        'onboarding.html',
        username=session.get('username'),
        csrf_token=session.get('csrf_token', ''),
    )


@pages.route('/dashboard')
@login_required
def dashboard():
    if not _has_company():
        return redirect(url_for('pages.onboarding'))

    currency_symbol = '£'
    try:
        from database import get_db
        conn = get_db()
        c = conn.cursor()
        c.execute('SELECT currency_symbol FROM companies WHERE company_id = ?', (session.get('company_id'),))
        row = c.fetchone()
        if row and row['currency_symbol']:
            currency_symbol = row['currency_symbol']
        conn.close()
    except Exception:
        pass

    return render_template(
        'dashboard.html',
        username=session['username'],
        role=session['role'],
        company_name=session.get('company_name', 'Company'),
        currency_symbol=currency_symbol,
        csrf_token=session.get('csrf_token', ''),
    )
