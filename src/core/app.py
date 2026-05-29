import os
import secrets
import sys
import threading
import time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.dirname(os.path.abspath(__file__))

if SRC not in sys.path:
    sys.path.insert(0, SRC)

from flask import Flask, jsonify, request, session
from werkzeug.security import generate_password_hash

from config import (
    IS_PRODUCTION,
    SECRET_KEY,
    SESSION_LIFETIME,
    SESSION_COOKIE_HTTPONLY,
    SESSION_COOKIE_SAMESITE,
    SESSION_COOKIE_SECURE,
)


def _run_migrations():
    """Apply schema additions for multi-tenant auth + onboarding."""
    from database import get_db

    conn = get_db()
    c = conn.cursor()

    def table_columns(table_name):
        c.execute(f"PRAGMA table_info({table_name})")
        return {row[1] for row in c.fetchall()}

    def add_col_if_missing(table_name, col_name, typedef):
        cols = table_columns(table_name)
        if col_name not in cols:
            c.execute(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {typedef}")

    c.executescript(
        """
        CREATE TABLE IF NOT EXISTS reorder_log (
            log_id            INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id        INTEGER NOT NULL,
            product_id        INTEGER NOT NULL,
            quantity_ordered  INTEGER NOT NULL,
            actual_quantity   INTEGER,
            expected_days     INTEGER NOT NULL DEFAULT 7,
            ordered_by        TEXT,
            notes             TEXT,
            status            TEXT NOT NULL DEFAULT 'pending',
            ordered_at        TEXT DEFAULT (DATETIME('now')),
            delivered_at      TEXT,
            FOREIGN KEY (company_id) REFERENCES companies(company_id),
            FOREIGN KEY (product_id) REFERENCES products(product_id)
        );

        CREATE INDEX IF NOT EXISTS idx_reorder_log_company ON reorder_log(company_id, status);

        CREATE TABLE IF NOT EXISTS companies (
            company_id    INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name  TEXT NOT NULL,
            industry      TEXT,
            description   TEXT,
            created_at    TEXT DEFAULT (DATE('now'))
        );

        CREATE TABLE IF NOT EXISTS invite_codes (
            code          TEXT PRIMARY KEY,
            company_id    INTEGER NOT NULL,
            created_by    INTEGER NOT NULL,
            used          INTEGER NOT NULL DEFAULT 0,
            expires_at    TEXT,
            created_at    TEXT DEFAULT (DATETIME('now')),
            FOREIGN KEY (company_id) REFERENCES companies(company_id),
            FOREIGN KEY (created_by) REFERENCES users(user_id)
        );

        CREATE TABLE IF NOT EXISTS upload_log (
            log_id              INTEGER PRIMARY KEY AUTOINCREMENT,
            filename            TEXT NOT NULL,
            uploaded_by         TEXT,
            rows_inserted       INTEGER DEFAULT 0,
            new_products        INTEGER DEFAULT 0,
            skipped_duplicates  INTEGER DEFAULT 0,
            inventory_updates   INTEGER DEFAULT 0,
            uploaded_at         TEXT DEFAULT (DATETIME('now'))
        );

        CREATE TABLE IF NOT EXISTS product_classification (
            class_id             INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id           INTEGER UNIQUE NOT NULL,
            abc_class            TEXT,
            xyz_class            TEXT,
            combined_class       TEXT,
            revenue_contribution REAL,
            cv                   REAL,
            review_frequency     TEXT,
            strategy             TEXT,
            classified_at        TEXT DEFAULT (DATETIME('now')),
            FOREIGN KEY (product_id) REFERENCES products(product_id)
        );

        CREATE TABLE IF NOT EXISTS rate_limits (
            rate_limit_id INTEGER PRIMARY KEY AUTOINCREMENT,
            bucket_key    TEXT NOT NULL,
            created_at    INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            token_hash TEXT PRIMARY KEY,
            user_id    INTEGER NOT NULL,
            expires_at TEXT NOT NULL,
            used_at    TEXT,
            created_at TEXT DEFAULT (DATETIME('now')),
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        );

        CREATE TABLE IF NOT EXISTS email_verification_tokens (
            token_hash TEXT PRIMARY KEY,
            user_id    INTEGER NOT NULL,
            expires_at TEXT NOT NULL,
            used_at    TEXT,
            created_at TEXT DEFAULT (DATETIME('now')),
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        );

        CREATE TABLE IF NOT EXISTS scenario_results (
            scenario_id  INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id   INTEGER NOT NULL,
            product_id   INTEGER,
            product_name TEXT,
            result_json  TEXT NOT NULL,
            created_at   TEXT DEFAULT (DATETIME('now')),
            FOREIGN KEY (company_id) REFERENCES companies(company_id)
        );

        CREATE TABLE IF NOT EXISTS pipeline_jobs (
            job_id             TEXT PRIMARY KEY,
            company_id         INTEGER NOT NULL,
            status             TEXT NOT NULL DEFAULT 'queued',
            message            TEXT,
            products_processed INTEGER DEFAULT 0,
            error              TEXT,
            created_at         TEXT DEFAULT (DATETIME('now')),
            started_at         TEXT,
            finished_at        TEXT,
            FOREIGN KEY (company_id) REFERENCES companies(company_id)
        );
        """
    )

    # User table upgrades
    add_col_if_missing("users", "email", "TEXT")
    add_col_if_missing("users", "password_hash", "TEXT")
    add_col_if_missing("users", "company_id", "INTEGER")
    add_col_if_missing("users", "is_active", "INTEGER NOT NULL DEFAULT 1")
    add_col_if_missing("users", "created_at", "TEXT")
    add_col_if_missing("users", "email_verified", "INTEGER NOT NULL DEFAULT 0")
    add_col_if_missing("invite_codes", "use_count", "INTEGER NOT NULL DEFAULT 0")
    add_col_if_missing("invite_codes", "max_uses", "INTEGER NOT NULL DEFAULT 1")

    # Data table multi-tenant boundaries
    add_col_if_missing("companies", "currency_symbol", "TEXT DEFAULT '£'")
    add_col_if_missing("products", "sku", "TEXT")
    add_col_if_missing("products", "purchase_cost", "REAL")
    table_col_additions = {
        "products": "company_id",
        "sales": "company_id",
        "inventory": "company_id",
        "forecast": "company_id",
        "decisions": "company_id",
        "evaluation": "company_id",
        "upload_log": "company_id",
        "product_classification": "company_id",
    }
    for table_name, col_name in table_col_additions.items():
        add_col_if_missing(table_name, col_name, "INTEGER")

    # Existing forecast/evaluation enhancements
    new_forecast_cols = [
        ("model_used", "TEXT DEFAULT 'SMA'"),
        ("lower_bound", "REAL DEFAULT 0"),
        ("upper_bound", "REAL DEFAULT 0"),
        ("stockout_prob", "REAL DEFAULT 0"),
        ("trend_slope", "REAL DEFAULT 0"),
        ("trend_direction", "TEXT DEFAULT 'STABLE'"),
    ]
    for col, typedef in new_forecast_cols:
        add_col_if_missing("forecast", col, typedef)

    new_eval_cols = [
        ("rmse", "REAL"),
        ("bias", "REAL"),
        ("mase", "REAL"),
        ("tracking_signal", "REAL"),
        ("naive_mae", "REAL"),
        ("naive_mase", "REAL"),
    ]
    for col, typedef in new_eval_cols:
        add_col_if_missing("evaluation", col, typedef)

    # Ensure DEFAULT_COMPANY exists and backfill legacy records
    c.execute("SELECT company_id FROM companies WHERE company_name = ?", ("DEFAULT_COMPANY",))
    row = c.fetchone()
    if row:
        default_company_id = row[0]
    else:
        c.execute(
            "INSERT INTO companies (company_name, industry, description) VALUES (?, ?, ?)",
            ("DEFAULT_COMPANY", "General Retail", "Auto-migrated legacy tenant"),
        )
        default_company_id = c.lastrowid

    # Backfill users.
    user_cols = table_columns("users")
    if "username" in user_cols and "email" in user_cols:
        c.execute("SELECT user_id, username, email FROM users")
        users = c.fetchall()
        used_emails = set()
        c.execute("SELECT email FROM users WHERE email IS NOT NULL AND email != ''")
        for (existing_email,) in c.fetchall():
            used_emails.add(existing_email.lower())
        for user_id, username, email in users:
            if not email:
                base = (username or f"user{user_id}").strip().lower().replace(" ", ".")
                generated_email = f"{base}@stocklens.local"
                if generated_email.lower() in used_emails:
                    generated_email = f"{base}+{user_id}@stocklens.local"
                c.execute("UPDATE users SET email = ? WHERE user_id = ?", (generated_email, user_id))
                used_emails.add(generated_email.lower())

    if "password" in user_cols and "password_hash" in user_cols:
        c.execute("SELECT user_id, password, password_hash FROM users")
        for user_id, plain_pw, pw_hash in c.fetchall():
            if pw_hash:
                continue
            if plain_pw:
                c.execute(
                    "UPDATE users SET password_hash = ? WHERE user_id = ?",
                    (generate_password_hash(plain_pw), user_id),
                )
        # Scrub legacy plaintext password column once hash exists.
        c.execute("UPDATE users SET password = '' WHERE password_hash IS NOT NULL")

    if "company_id" in user_cols:
        c.execute(
            "UPDATE users SET company_id = ? WHERE company_id IS NULL",
            (default_company_id,),
        )
    if "created_at" in user_cols:
        c.execute(
            "UPDATE users SET created_at = DATETIME('now') WHERE created_at IS NULL",
        )

    # Set default company_id for legacy data rows
    for table_name in table_col_additions.keys():
        cols = table_columns(table_name)
        if "company_id" in cols:
            c.execute(
                f"UPDATE {table_name} SET company_id = ? WHERE company_id IS NULL",
                (default_company_id,),
            )
    # data_source tracking: distinguishes CSV uploads from manual entries
    add_col_if_missing("products", "data_source", "TEXT DEFAULT 'upload'")
    add_col_if_missing("sales",    "data_source", "TEXT DEFAULT 'upload'")

    # Backfill SKU for products missing one.
    product_cols = table_columns("products")
    if "sku" in product_cols:
        c.execute("UPDATE products SET sku = ('SKU-' || product_id) WHERE sku IS NULL OR TRIM(sku) = ''")

    # Helpful indexes
    c.executescript(
        """
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
        CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
        CREATE INDEX IF NOT EXISTS idx_sales_company ON sales(company_id);
        CREATE INDEX IF NOT EXISTS idx_inventory_company ON inventory(company_id);
        CREATE INDEX IF NOT EXISTS idx_forecast_company ON forecast(company_id);
        CREATE INDEX IF NOT EXISTS idx_decisions_company ON decisions(company_id);
        CREATE INDEX IF NOT EXISTS idx_evaluation_company ON evaluation(company_id);
        CREATE INDEX IF NOT EXISTS idx_classification_company ON product_classification(company_id);
        CREATE INDEX IF NOT EXISTS idx_upload_log_company ON upload_log(company_id);
        CREATE INDEX IF NOT EXISTS idx_invite_codes_company ON invite_codes(company_id);
        CREATE INDEX IF NOT EXISTS idx_rate_limits_bucket ON rate_limits(bucket_key, created_at);
        CREATE INDEX IF NOT EXISTS idx_scenario_results_company ON scenario_results(company_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_company ON pipeline_jobs(company_id, created_at);
        """
    )

    conn.commit()
    conn.close()


def create_app():
    app = Flask(
        __name__,
        template_folder=os.path.join(SRC, "templates"),
        static_folder=os.path.join(SRC, "static"),
    )
    app.secret_key = SECRET_KEY
    app.config["PERMANENT_SESSION_LIFETIME"] = SESSION_LIFETIME
    app.config["SESSION_COOKIE_HTTPONLY"] = SESSION_COOKIE_HTTPONLY
    app.config["SESSION_COOKIE_SAMESITE"] = SESSION_COOKIE_SAMESITE
    app.config["SESSION_COOKIE_SECURE"] = SESSION_COOKIE_SECURE
    app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB upload limit
    if IS_PRODUCTION and not app.config["SESSION_COOKIE_SECURE"]:
        raise RuntimeError("SESSION_COOKIE_SECURE must be enabled in production.")

    @app.before_request
    def csrf_protect():
        if "csrf_token" not in session:
            session["csrf_token"] = secrets.token_urlsafe(32)
        if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
            return None
        if not request.path.startswith("/api/"):
            return None
        if "user_id" not in session:
            return None
        exempt = {
            "/api/login",
            "/api/register",
            "/api/password/forgot",
            "/api/password/reset",
            "/api/email/verify",
        }
        if request.path in exempt:
            return None
        supplied = request.headers.get("X-CSRF-Token") or request.form.get("csrf_token")
        if not supplied or supplied != session.get("csrf_token"):
            return jsonify({"message": "CSRF token missing or invalid"}), 403

    _run_migrations()

    @app.errorhandler(413)
    def upload_too_large(e):
        from flask import jsonify
        return jsonify({'error': 'File too large. Maximum upload size is 16 MB.'}), 413

    from routes.pages import pages
    from routes.auth import auth
    from routes.onboarding import onboarding
    from routes.api import api
    from routes.admin import admin
    from routes.manual import manual_bp

    app.register_blueprint(pages)
    app.register_blueprint(auth, url_prefix="/api")
    app.register_blueprint(onboarding, url_prefix="/api")
    app.register_blueprint(api, url_prefix="/api")
    app.register_blueprint(admin, url_prefix="/api")
    app.register_blueprint(manual_bp, url_prefix="/api")

    if os.getenv("ENABLE_SCHEDULER", "0") == "1":
        _start_scheduler()

    return app


def _start_scheduler():
    if getattr(_start_scheduler, "_started", False):
        return
    _start_scheduler._started = True

    def loop():
        while True:
            try:
                from routes.api import run_pipeline_sync_for_company
                from database import get_db
                conn = get_db()
                c = conn.cursor()
                c.execute("SELECT company_id FROM companies")
                company_ids = [r['company_id'] for r in c.fetchall()]
                conn.close()
                for company_id in company_ids:
                    run_pipeline_sync_for_company(company_id)
            except Exception:
                import logging
                logging.getLogger(__name__).exception("Scheduled pipeline failed")
            time.sleep(int(os.getenv("SCHEDULER_INTERVAL_SECONDS", "86400")))

    threading.Thread(target=loop, name="stocklens-scheduler", daemon=True).start()


if __name__ == "__main__":
    app = create_app()
    app.run(debug=not IS_PRODUCTION, port=int(os.getenv("PORT", "5001")))
