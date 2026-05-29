# StockLens VS Code Agent Responses

## Question 1 — Project structure

```text
.DS_Store
.claude/settings.json
.claude/settings.local.json
.env.example
.pytest_cache/.gitignore
.pytest_cache/CACHEDIR.TAG
.pytest_cache/README.md
.pytest_cache/v/cache/lastfailed
.pytest_cache/v/cache/nodeids
Procfile
data/sales.csv
data/sample_upload.csv
db/stocklens.db
dissertation.md
docs/deployment.md
docs/production-queue.md
migrations/postgres/001_initial.sql
requirements.txt
run.py
setup/create_db.py
setup/generate_data.py
setup/run_forecasts.py
setup/smoke_test_multitenant.py
src/core/app.py
src/core/auth_utils.py
src/core/config.py
src/core/database.py
src/core/forecast.py
src/core/mailer.py
src/core/rate_limit.py
src/core/routes/__init__.py
src/core/routes/admin.py
src/core/routes/api.py
src/core/routes/auth.py
src/core/routes/manual.py
src/core/routes/onboarding.py
src/core/routes/pages.py
src/core/services/__init__.py
src/core/services/abc_xyz_service.py
src/core/services/decision_service.py
src/core/services/evaluation_service.py
src/core/services/forecast_service.py
src/core/services/scenario_service.py
src/core/static/brand-icon.png
src/core/static/css/style.css
src/core/static/favicon.svg
src/core/static/js/app.js
src/core/static/js/charts.js
src/core/static/js/translations.js
src/core/static/vendor/chart.umd.min.js
src/core/static/vendor/lucide.min.js
src/core/templates/dashboard.html
src/core/templates/forgot_password.html
src/core/templates/homepage.html
src/core/templates/legal.html
src/core/templates/login.html
src/core/templates/onboarding.html
src/core/templates/register.html
src/core/templates/reset_password.html
src/core/templates/verify_email.html
src/setup/check_data.py
src/setup/create_db.py
src/setup/insert_data.py
src/setup/load_data.py
src/setup/test_load.py
tests/test_readiness.py
wsgi.py
```

## Question 2 — Entry point

### wsgi.py
```python
from src.core.app import create_app

app = create_app()

```

## Question 3 — Main application factory or main Flask file

Found: `src/core/app.py`

### src/core/app.py
```python
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

```

## Question 4 — Database models

No files matched `db.Model` or `DeclarativeBase`. This project appears to use raw SQLite SQL/schema scripts rather than SQLAlchemy model classes.

## Question 5 — Forecasting engine

Found implementation/orchestration files containing forecasting logic: `src/core/forecast.py`, `src/core/services/forecast_service.py`, `setup/run_forecasts.py`

### src/core/forecast.py
```python
import pandas as pd
import sqlite3

# -----------------------------
# 1. Connect to database
# -----------------------------
conn = sqlite3.connect("db/stocklens.db")
cursor = conn.cursor()

# -----------------------------
# 2. Load data
# -----------------------------
df_sales = pd.read_sql("SELECT * FROM sales", conn)

# -----------------------------
# 3. Data cleaning
# -----------------------------
df_sales['product_id'] = df_sales['product_id'].astype(str)
df_sales['date'] = pd.to_datetime(df_sales['date'])

# -----------------------------
# 4. Sort data
# -----------------------------
df_sales = df_sales.sort_values(by='date')

# -----------------------------
# 5. Aggregate data
# -----------------------------
df_sales = (
    df_sales
    .groupby(['product_id', 'date'])['units_sold']
    .sum()
    .reset_index()
)

# -----------------------------
# 6. Filter one product
# -----------------------------
df_product = df_sales[df_sales['product_id'] == "1"]

# -----------------------------
# 7. Set time index
# -----------------------------
df_product = df_product.set_index('date')

# -----------------------------
# 8. Fill missing dates
# -----------------------------
df_product = df_product.asfreq('D').fillna(0)

# -----------------------------
# 9. Forecast Demand
# -----------------------------
forecast_demand = df_product['units_sold'].mean()
print("Forecast Demand:", forecast_demand)

# -----------------------------
# 10. Safety Stock
# -----------------------------
safety_stock = df_product['units_sold'].std()
print("Safety Stock:", safety_stock)

# -----------------------------
# 11. Reorder Point
# -----------------------------
reorder_point = forecast_demand + safety_stock
print("Reorder Point:", reorder_point)

# -----------------------------
# 12. Order Quantity
# -----------------------------
order_quantity = forecast_demand * 2
print("Order Quantity:", order_quantity)

# -----------------------------
# 13. Risk Flag
# -----------------------------
cursor.execute("SELECT stock_on_hand FROM inventory WHERE product_id = 1")
current_stock = cursor.fetchone()[0]

if current_stock > reorder_point:
    risk_flag = "LOW"
elif current_stock == reorder_point:
    risk_flag = "MEDIUM"
else:
    risk_flag = "HIGH"

print("Current Stock:", current_stock)
print("Risk Flag:", risk_flag)

# -----------------------------
# 14. Save FINAL forecast
# -----------------------------
cursor.execute("""
INSERT INTO forecast (
    product_id,
    forecast_demand,
    safety_stock,
    reorder_point,
    order_quantity,
    risk_flag,
    created_at
)
VALUES (?, ?, ?, ?, ?, ?, DATE('now'))
""", (
    "1",
    float(forecast_demand),
    float(safety_stock),
    float(reorder_point),
    float(order_quantity),
    risk_flag
))

conn.commit()

# -----------------------------
# 15. Preview data
# -----------------------------
print("\nProcessed Time Series:")
print(df_product.head(10))

# -----------------------------
# 16. Close connection
# -----------------------------
conn.close()
```

### src/core/services/forecast_service.py
```python
"""
Forecast + inventory metrics — multi-model with automatic selection.

Models evaluated (training window = days -90 to -31, validation = days -30 to -1):
  SMA   — Simple Moving Average (60-day mean)
  WMA   — Weighted Moving Average (linear decay, recent days count more)
  SES   — Single Exponential Smoothing (alpha = 0.3)
  HOLT  — Holt's Linear Trend (alpha = 0.3, beta = 0.1)

Best model = lowest MAE on validation window. Production forecast uses that model.

Inventory formulas:
  safety_stock   = Z * std_dev * sqrt(lead_time)          (Z=1.645, 95% service level)
  reorder_point  = (demand * lead_time) + safety_stock
  order_quantity = EOQ = sqrt(2 * D * S / H)               (Wilson formula)
    D = annual demand, S = ordering cost per order, H = holding cost per unit/year

Stockout probability:
  P(stockout during lead time) = P(demand_LT > stock)
  demand_LT ~ Normal(mu = demand * LT, sigma = std * sqrt(LT))
  p = 1 - Phi(z)  where z = (stock - mu) / sigma

Confidence intervals (95%):
  lower = forecast_demand - Z * std_dev
  upper = forecast_demand + Z * std_dev

Trend detection (linear regression slope on last 30 days):
  slope > 0.3  → INCREASING
  slope < -0.3 → DECREASING
  otherwise    → STABLE
"""
import math
from database import get_db

LEAD_TIME        = 7       # days
Z_SCORE          = 1.645   # 95% service level
ORDERING_COST    = 25.0    # £ per order (fixed default)
HOLDING_RATE     = 0.25    # 25% of unit price per year


# ── Normal CDF (no scipy dependency) ──────────────────────────────────────────

def _norm_cdf(x):
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


# ── Forecasting models ─────────────────────────────────────────────────────────

def _sma(series):
    """Simple Moving Average — mean of all values."""
    return sum(series) / len(series) if series else 0.0


def _wma(series):
    """Weighted Moving Average — linearly increasing weights (newest = highest)."""
    n = len(series)
    if n == 0:
        return 0.0
    weights    = list(range(1, n + 1))
    total_w    = sum(weights)
    return sum(w * v for w, v in zip(weights, series)) / total_w


def _ses(series, alpha=0.3):
    """Single Exponential Smoothing."""
    if not series:
        return 0.0
    s = series[0]
    for v in series[1:]:
        s = alpha * v + (1 - alpha) * s
    return s


def _holt(series, alpha=0.3, beta=0.1):
    """Holt's Linear Trend — level + trend components."""
    if len(series) < 2:
        return _ses(series, alpha)
    level = series[0]
    trend = series[1] - series[0]
    for v in series[1:]:
        prev_level = level
        level = alpha * v + (1 - alpha) * (level + trend)
        trend = beta * (level - prev_level) + (1 - beta) * trend
    return max(0.0, level + trend)


MODELS = {
    'SMA':  _sma,
    'WMA':  _wma,
    'SES':  _ses,
    'HOLT': _holt,
}


def _select_best_model(train, validate):
    """
    Evaluate each model on the train window; compute MAE against validate.
    Returns (best_model_name, best_forecast, model_scores_dict).
    """
    best_name  = 'SMA'
    best_fc    = _sma(train)
    best_mae   = float('inf')
    scores     = {}

    for name, fn in MODELS.items():
        fc  = fn(train)
        mae = sum(abs(fc - v) for v in validate) / len(validate)
        scores[name] = round(mae, 3)
        if mae < best_mae:
            best_mae  = mae
            best_name = name
            best_fc   = fc

    return best_name, max(0.0, best_fc), scores


# ── Trend detection ────────────────────────────────────────────────────────────

def _linear_slope(series):
    """Return OLS slope of series (simple linear regression, x = 0,1,...,n-1)."""
    n = len(series)
    if n < 2:
        return 0.0
    x_mean = (n - 1) / 2.0
    y_mean = sum(series) / n
    num    = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(series))
    den    = sum((i - x_mean) ** 2 for i in range(n))
    return num / den if den else 0.0


def _trend_direction(slope):
    if slope > 0.3:
        return 'INCREASING'
    if slope < -0.3:
        return 'DECREASING'
    return 'STABLE'


# ── EOQ ───────────────────────────────────────────────────────────────────────

def _eoq(daily_demand, unit_price):
    """
    Wilson Economic Order Quantity.
    EOQ = sqrt(2 * D * S / H)
      D = annual demand, S = ordering cost per order, H = holding cost per unit/year
    """
    annual_demand = daily_demand * 365.0
    if annual_demand <= 0:
        return 1
    holding_cost = max(0.10, unit_price * HOLDING_RATE)
    eoq = math.sqrt((2 * annual_demand * ORDERING_COST) / holding_cost)
    return max(1, round(eoq))


# ── Main service function ──────────────────────────────────────────────────────

def run_forecast_for_product(product_id: int, is_active: int = 1):
    conn = get_db()
    c    = conn.cursor()
    c.execute("SELECT company_id FROM products WHERE product_id = ?", (product_id,))
    product_row = c.fetchone()
    if not product_row:
        conn.close()
        return
    company_id = product_row['company_id']

    if not is_active:
        c.execute("""
            INSERT INTO forecast
                (company_id, product_id, forecast_demand, safety_stock, reorder_point,
                 order_quantity, risk_flag, model_used, lower_bound, upper_bound,
                 stockout_prob, trend_slope, trend_direction)
            VALUES (?, ?, 0, 0, 0, 0, 'INACTIVE', 'N/A', 0, 0, 0, 0, 'STABLE')
        """, (company_id, product_id))
        conn.commit()
        conn.close()
        return

    # ── Fetch historical sales ────────────────────────────────────────────────
    c.execute("""
        SELECT units_sold FROM sales
        WHERE company_id = ? AND product_id = ?
        ORDER BY date DESC
        LIMIT 90
    """, (company_id, product_id))
    all_rows = [r['units_sold'] for r in c.fetchall()]

    if len(all_rows) < 30:
        # Write a placeholder so the decision service can show "insufficient data"
        c.execute("""
            INSERT INTO forecast
                (company_id, product_id, forecast_demand, safety_stock, reorder_point,
                 order_quantity, risk_flag, model_used, lower_bound, upper_bound,
                 stockout_prob, trend_slope, trend_direction)
            VALUES (?, ?, 0, 0, 0, 0, 'LOW', 'N/A', 0, 0, 0, 0, 'STABLE')
        """, (company_id, product_id))
        conn.commit()
        conn.close()
        return

    # Reverse so oldest-first
    all_rows = list(reversed(all_rows))

    train    = all_rows[:60] if len(all_rows) >= 90 else all_rows[:-30]
    validate = all_rows[-30:]

    # ── Model selection ───────────────────────────────────────────────────────
    model_name, mean_demand, model_scores = _select_best_model(train, validate)

    # ── Standard deviation (on training window) ───────────────────────────────
    n         = len(train)
    variance  = sum((x - mean_demand) ** 2 for x in train) / max(n - 1, 1)
    std_dev   = math.sqrt(variance)

    # ── Trend ────────────────────────────────────────────────────────────────
    trend_data  = all_rows[-30:]  # last 30 days for trend
    slope       = round(_linear_slope(trend_data), 4)
    trend_dir   = _trend_direction(slope)

    # ── Safety stock, reorder point ───────────────────────────────────────────
    safety_stock  = Z_SCORE * std_dev * math.sqrt(LEAD_TIME)
    reorder_point = (mean_demand * LEAD_TIME) + safety_stock

    # ── Confidence interval (95% for daily demand) ────────────────────────────
    lower_bound = max(0.0, mean_demand - Z_SCORE * std_dev)
    upper_bound = mean_demand + Z_SCORE * std_dev

    # ── EOQ ───────────────────────────────────────────────────────────────────
    c.execute("SELECT price FROM products WHERE company_id = ? AND product_id = ?", (company_id, product_id))
    price_row  = c.fetchone()
    unit_price = float(price_row['price'] or 1.0) if price_row else 1.0
    order_qty  = _eoq(mean_demand, unit_price)

    # ── Stock & risk ──────────────────────────────────────────────────────────
    c.execute("SELECT stock_on_hand FROM inventory WHERE company_id = ? AND product_id = ?", (company_id, product_id))
    inv_row = c.fetchone()
    stock   = inv_row['stock_on_hand'] if inv_row else 0

    if stock < safety_stock:
        risk_flag = 'HIGH'
    elif stock < reorder_point:
        risk_flag = 'MEDIUM'
    else:
        risk_flag = 'LOW'

    # ── Stockout probability during lead time ────────────────────────────────
    sigma_lt = std_dev * math.sqrt(LEAD_TIME)
    mu_lt    = mean_demand * LEAD_TIME
    if sigma_lt > 0:
        z_so           = (stock - mu_lt) / sigma_lt
        stockout_prob  = round((1.0 - _norm_cdf(z_so)) * 100.0, 1)
    else:
        stockout_prob  = 0.0 if stock > mu_lt else 100.0

    stockout_prob = max(0.0, min(100.0, stockout_prob))

    c.execute("""
        INSERT INTO forecast
            (company_id, product_id, forecast_demand, safety_stock, reorder_point,
             order_quantity, risk_flag, model_used,
             lower_bound, upper_bound, stockout_prob,
             trend_slope, trend_direction)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (company_id,
          product_id,
          round(mean_demand, 2),
          round(safety_stock, 2),
          round(reorder_point, 2),
          int(order_qty),
          risk_flag,
          model_name,
          round(lower_bound, 2),
          round(upper_bound, 2),
          stockout_prob,
          slope,
          trend_dir))

    conn.commit()
    conn.close()

```

### setup/run_forecasts.py
```python
"""
Runs the full forecast pipeline for all products:
1. Forecast demand + inventory metrics (multi-model, EOQ, stockout prob, trend)
2. Decision output (REORDER / AT_RISK / HOLD / INACTIVE)
3. Evaluation (MAE, RMSE, bias, MASE, tracking signal)
4. Scenario comparison (with vs without system)
5. ABC-XYZ inventory classification

Run this after generate_data.py.
"""
import os
import sys
import argparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, 'src', 'core')
sys.path.insert(0, SRC)

import sqlite3
from config import DB_PATH
from services.forecast_service   import run_forecast_for_product
from services.decision_service   import compute_decision_for_product
from services.evaluation_service import run_evaluation_for_product
from services.scenario_service   import run_scenario_comparison
from services.abc_xyz_service    import run_classification


def run_all(company_id=None):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Reset computed tables
    if company_id is None:
        c.executescript("""
            DELETE FROM evaluation;
            DELETE FROM decisions;
            DELETE FROM forecast;
            DELETE FROM product_classification;
        """)
    else:
        c.execute("DELETE FROM evaluation WHERE company_id = ?", (company_id,))
        c.execute("DELETE FROM decisions WHERE company_id = ?", (company_id,))
        c.execute("DELETE FROM forecast WHERE company_id = ?", (company_id,))
        c.execute("DELETE FROM product_classification WHERE company_id = ?", (company_id,))
    conn.commit()

    if company_id is None:
        c.execute("SELECT product_id, is_active FROM products ORDER BY product_id")
    else:
        c.execute("SELECT product_id, is_active FROM products WHERE company_id = ? ORDER BY product_id", (company_id,))
    products = c.fetchall()
    conn.close()

    for product_id, is_active in products:
        run_forecast_for_product(product_id, is_active)
        compute_decision_for_product(product_id)
        if is_active:
            run_evaluation_for_product(product_id)

    run_scenario_comparison(company_id=company_id)
    run_classification(company_id=company_id)
    print(f"Pipeline complete: {len(products)} products processed.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Run StockLens forecasting pipeline.')
    parser.add_argument(
        '--company-id',
        type=int,
        default=None,
        help='Optional company_id to process only one tenant.',
    )
    args = parser.parse_args()
    run_all(company_id=args.company_id)

```

## Question 6 — Routes and blueprints

Found: `src/core/routes/admin.py`, `src/core/routes/api.py`, `src/core/routes/auth.py`, `src/core/routes/manual.py`, `src/core/routes/onboarding.py`, `src/core/routes/pages.py`

### src/core/routes/admin.py
```python
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

```

### src/core/routes/api.py
```python
"""
All data API routes for StockLens.

Role guards:
  - manager_only() → 403 for staff
  - login_required() → 401 for unauthenticated

Endpoints:
  GET  /api/products
  POST /api/products/<id>/toggle-status    (manager)
  GET  /api/inventory
  GET  /api/forecast                       (manager)
  GET  /api/decisions
  GET  /api/analytics/sales
  GET  /api/analytics/forecast-vs-actual
  GET  /api/analytics/inventory
  GET  /api/evaluation                     (manager)
  GET  /api/scenario                       (manager)
  POST /api/upload/sales                   (manager) CSV upload → re-run pipeline
  GET  /api/upload/sample-csv              (manager) Download sample CSV template
"""
import io
import csv
import json
import threading
import uuid
from datetime import datetime
from flask import Blueprint, current_app, jsonify, request, session, Response
from auth_utils import api_login_required, api_manager_only, require_company
from database import get_db
from services.scenario_service import load_scenario_results

api = Blueprint('api', __name__)

try:
    from dateutil import parser as date_parser
except Exception:
    date_parser = None


# ── helpers ────────────────────────────────────────────────────────────────────

def login_required():
    return api_login_required()


def manager_only():
    return api_manager_only()


def row_to_dict(row):
    return dict(row)


def _compute_data_quality(company_id, affected_pids, total_rows, total_skipped_dups, total_skipped_ret):
    total_parsed  = total_rows + total_skipped_dups + total_skipped_ret
    quality_score = round((total_rows / total_parsed * 100), 1) if total_parsed > 0 else 100.0
    if quality_score >= 85:
        quality_label = 'Good'
    elif quality_score >= 60:
        quality_label = 'Fair'
    else:
        quality_label = 'Poor'

    below_threshold = 0
    at_threshold    = 0
    warnings        = []

    if affected_pids:
        conn = get_db()
        c    = conn.cursor()
        placeholders = ','.join('?' * len(affected_pids))
        c.execute(
            f"SELECT product_id, COUNT(*) as cnt FROM sales "
            f"WHERE company_id = ? AND product_id IN ({placeholders}) "
            f"GROUP BY product_id",
            [company_id, *list(affected_pids)],
        )
        for row in c.fetchall():
            if row['cnt'] < 30:
                below_threshold += 1
            elif row['cnt'] < 90:
                at_threshold += 1

        c.execute(
            "SELECT COUNT(*) as cnt FROM products "
            "WHERE company_id = ? AND (price IS NULL OR price = 0)",
            (company_id,),
        )
        null_price = c.fetchone()['cnt']
        conn.close()

        if null_price:
            s = 's' if null_price > 1 else ''
            warnings.append(f"{null_price} product{s} have no price — ABC classification may be inaccurate")

    if below_threshold:
        s = 's' if below_threshold > 1 else ''
        warnings.append(f"{below_threshold} product{s} have insufficient data for forecasting (< 30 days)")
    if at_threshold:
        s = 's' if at_threshold > 1 else ''
        warnings.append(f"{at_threshold} product{s} can forecast but not evaluate (30–89 days — need 90+ for accuracy metrics)")
    if total_skipped_dups:
        s = 's' if total_skipped_dups > 1 else ''
        warnings.append(f"{total_skipped_dups} duplicate row{s} detected and removed")

    return {
        'quality_score':              quality_score,
        'quality_label':              quality_label,
        'products_below_threshold':   below_threshold,
        'products_at_threshold':      at_threshold,
        'data_quality_warnings':      warnings,
    }


# ── products ───────────────────────────────────────────────────────────────────

@api.route('/products')
def get_products():
    err = login_required()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    c.execute("""
        SELECT p.product_id, p.product_name, p.sku, p.category,
               p.purchase_cost, p.price,
               p.is_active, p.is_seasonal, p.season,
               i.stock_on_hand,
               d.action AS decision
        FROM products p
        LEFT JOIN inventory i
          ON i.product_id = p.product_id AND i.company_id = p.company_id
        LEFT JOIN (
            SELECT product_id, action
            FROM decisions
            WHERE company_id = ?
              AND decision_id IN (
                SELECT MAX(decision_id) FROM decisions
                WHERE company_id = ?
                GROUP BY product_id
            )
        ) d ON p.product_id = d.product_id
        WHERE p.company_id = ?
        ORDER BY p.product_name
    """, (company_id, company_id, company_id))
    rows = [row_to_dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)


@api.route('/products/<int:product_id>/toggle-status', methods=['POST'])
def toggle_product_status(product_id):
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    c.execute(
        "SELECT is_active FROM products WHERE product_id = ? AND company_id = ?",
        (product_id, company_id),
    )
    product = c.fetchone()

    if not product:
        conn.close()
        return jsonify({'message': 'Product not found'}), 404

    new_status = 0 if product['is_active'] else 1
    c.execute(
        "UPDATE products SET is_active = ? WHERE product_id = ? AND company_id = ?",
        (new_status, product_id, company_id),
    )
    c.execute("DELETE FROM forecast WHERE company_id = ? AND product_id = ?", (company_id, product_id))
    c.execute("DELETE FROM decisions WHERE company_id = ? AND product_id = ?", (company_id, product_id))
    c.execute("DELETE FROM evaluation WHERE company_id = ? AND product_id = ?", (company_id, product_id))
    conn.commit()
    conn.close()

    from services.forecast_service import run_forecast_for_product
    from services.decision_service import compute_decision_for_product
    from services.evaluation_service import run_evaluation_for_product

    run_forecast_for_product(product_id, new_status)
    compute_decision_for_product(product_id)
    if new_status:
        run_evaluation_for_product(product_id)

    return jsonify({'product_id': product_id, 'is_active': new_status})


# ── inventory ──────────────────────────────────────────────────────────────────

@api.route('/inventory')
def get_inventory():
    err = login_required()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    c.execute("""
        SELECT i.inventory_id, i.product_id, p.product_name, p.category,
               i.stock_on_hand, i.last_updated,
               f.reorder_point, f.order_quantity, f.safety_stock, f.risk_flag
        FROM inventory i
        JOIN products p ON i.product_id = p.product_id
        LEFT JOIN (
            SELECT product_id, reorder_point, order_quantity, safety_stock, risk_flag
            FROM forecast
            WHERE company_id = ?
              AND rec_id IN (
                SELECT MAX(rec_id) FROM forecast
                WHERE company_id = ?
                GROUP BY product_id
            )
        ) f ON i.product_id = f.product_id
        WHERE i.company_id = ? AND p.company_id = ?
        ORDER BY p.product_name
    """, (company_id, company_id, company_id, company_id))
    rows = [row_to_dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)


# ── forecast (manager only) ────────────────────────────────────────────────────

@api.route('/forecast')
def get_forecast():
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    c.execute("""
        SELECT f.rec_id, f.product_id, p.product_name, p.category,
               f.forecast_demand, f.safety_stock, f.reorder_point,
               f.order_quantity, f.risk_flag, f.created_at,
               f.model_used, f.lower_bound, f.upper_bound,
               f.stockout_prob, f.trend_slope, f.trend_direction
        FROM forecast f
        JOIN products p ON f.product_id = p.product_id
        WHERE f.company_id = ?
          AND p.company_id = ?
          AND f.rec_id IN (
            SELECT MAX(rec_id) FROM forecast
            WHERE company_id = ?
            GROUP BY product_id
        )
        ORDER BY p.product_name
    """, (company_id, company_id, company_id))
    rows = [row_to_dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)


# ── decisions ──────────────────────────────────────────────────────────────────

@api.route('/decisions')
def get_decisions():
    err = login_required()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    is_manager = session.get('role') == 'manager'

    conn = get_db()
    c    = conn.cursor()

    if is_manager:
        c.execute("""
            SELECT d.decision_id, d.product_id, p.product_name, p.category,
                   d.action, d.reason, d.created_at,
                   f.forecast_demand, f.risk_flag, f.lower_bound, f.upper_bound,
                   f.reorder_point, f.order_quantity, f.safety_stock,
                   f.stockout_prob, f.model_used, f.trend_direction,
                   pr.log_id AS pending_reorder_id,
                   pr.quantity_ordered AS pending_quantity_ordered,
                   DATE(pr.ordered_at, '+' || pr.expected_days || ' days') AS pending_expected_arrival
            FROM decisions d
            JOIN products p ON d.product_id = p.product_id
            LEFT JOIN (
                SELECT product_id, forecast_demand, risk_flag, lower_bound, upper_bound,
                       reorder_point, order_quantity, safety_stock,
                       stockout_prob, model_used, trend_direction
                FROM forecast
                WHERE company_id = ?
                  AND rec_id IN (
                    SELECT MAX(rec_id) FROM forecast
                    WHERE company_id = ?
                    GROUP BY product_id
                )
            ) f ON d.product_id = f.product_id
            LEFT JOIN reorder_log pr
              ON pr.product_id = d.product_id
             AND pr.company_id = d.company_id
             AND pr.status = 'pending'
             AND pr.log_id = (
                SELECT MAX(log_id)
                FROM reorder_log
                WHERE company_id = d.company_id
                  AND product_id = d.product_id
                  AND status = 'pending'
             )
            WHERE d.company_id = ? AND p.company_id = ?
              AND d.decision_id IN (
                SELECT MAX(decision_id) FROM decisions
                WHERE company_id = ?
                GROUP BY product_id
            )
            ORDER BY
                CASE d.action
                    WHEN 'REORDER'   THEN 1
                    WHEN 'AT_RISK'   THEN 2
                    WHEN 'OVERSTOCK' THEN 3
                    WHEN 'HOLD'      THEN 4
                    WHEN 'INACTIVE'  THEN 5
                END
        """, (company_id, company_id, company_id, company_id, company_id))
    else:
        # Staff: simplified view — action, stock level, and recommended order qty
        c.execute("""
            SELECT d.decision_id, d.product_id, p.product_name, p.category,
                   d.action, d.created_at,
                   i.stock_on_hand,
                   f.order_quantity, f.forecast_demand
            FROM decisions d
            JOIN products p ON d.product_id = p.product_id
            LEFT JOIN inventory i ON i.product_id = d.product_id AND i.company_id = d.company_id
            LEFT JOIN (
                SELECT product_id, order_quantity, forecast_demand
                FROM forecast
                WHERE company_id = ?
                  AND rec_id IN (
                    SELECT MAX(rec_id) FROM forecast
                    WHERE company_id = ?
                    GROUP BY product_id
                )
            ) f ON d.product_id = f.product_id
            WHERE d.company_id = ? AND p.company_id = ?
              AND d.decision_id IN (
                SELECT MAX(decision_id) FROM decisions
                WHERE company_id = ?
                GROUP BY product_id
            )
            ORDER BY
                CASE d.action
                    WHEN 'REORDER'   THEN 1
                    WHEN 'AT_RISK'   THEN 2
                    WHEN 'OVERSTOCK' THEN 3
                    WHEN 'HOLD'      THEN 4
                    WHEN 'INACTIVE'  THEN 5
                END
        """, (company_id, company_id, company_id, company_id, company_id))

    rows = [row_to_dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)


@api.route('/decisions/history')
def get_decision_history():
    err = login_required()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    product_id = request.args.get('product_id', type=int)
    conn = get_db()
    c = conn.cursor()
    params = [company_id, company_id]
    where_product = ''
    if product_id:
        where_product = 'AND d.product_id = ?'
        params.append(product_id)
    c.execute(f"""
        SELECT d.decision_id, d.product_id, p.product_name, d.action, d.reason, d.created_at,
               rl.log_id, rl.status AS reorder_status, rl.quantity_ordered,
               rl.actual_quantity, rl.ordered_at, rl.delivered_at
        FROM decisions d
        JOIN products p ON p.product_id = d.product_id AND p.company_id = ?
        LEFT JOIN reorder_log rl
          ON rl.product_id = d.product_id
         AND rl.company_id = d.company_id
         AND rl.ordered_at >= d.created_at
        WHERE d.company_id = ? {where_product}
        ORDER BY d.created_at DESC, d.decision_id DESC
        LIMIT 200
    """, params)
    rows = [row_to_dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)


@api.route('/decisions/export.csv')
def export_decisions_csv():
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c = conn.cursor()
    c.execute("""
        SELECT p.product_name, p.category, d.action, d.reason,
               f.forecast_demand, f.reorder_point, f.order_quantity,
               f.safety_stock, f.stockout_prob, f.model_used, d.created_at
        FROM decisions d
        JOIN products p ON d.product_id = p.product_id
        LEFT JOIN (
            SELECT product_id, forecast_demand, reorder_point, order_quantity,
                   safety_stock, stockout_prob, model_used
            FROM forecast
            WHERE company_id = ?
              AND rec_id IN (
                SELECT MAX(rec_id) FROM forecast
                WHERE company_id = ?
                GROUP BY product_id
              )
        ) f ON d.product_id = f.product_id
        WHERE d.company_id = ? AND p.company_id = ?
          AND d.decision_id IN (
            SELECT MAX(decision_id) FROM decisions
            WHERE company_id = ?
            GROUP BY product_id
          )
        ORDER BY
          CASE d.action
            WHEN 'REORDER' THEN 1
            WHEN 'AT_RISK' THEN 2
            WHEN 'OVERSTOCK' THEN 3
            WHEN 'HOLD' THEN 4
            WHEN 'INACTIVE' THEN 5
          END,
          p.product_name
    """, (company_id, company_id, company_id, company_id, company_id))

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'product_name', 'category', 'decision', 'recommended_order_qty',
        'reorder_point', 'safety_stock', 'forecast_demand_per_day',
        'stockout_probability_pct', 'model_used', 'reason', 'created_at',
    ])
    for row in c.fetchall():
        writer.writerow([
            row['product_name'], row['category'], row['action'],
            row['order_quantity'] if row['order_quantity'] is not None else '',
            row['reorder_point'] if row['reorder_point'] is not None else '',
            row['safety_stock'] if row['safety_stock'] is not None else '',
            row['forecast_demand'] if row['forecast_demand'] is not None else '',
            row['stockout_prob'] if row['stockout_prob'] is not None else '',
            row['model_used'] or '',
            row['reason'] or '',
            row['created_at'] or '',
        ])
    conn.close()
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=stocklens_decisions.csv'},
    )


# ── analytics ──────────────────────────────────────────────────────────────────

@api.route('/analytics/sales')
def analytics_sales():
    err = login_required()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    # Last 30 days of daily sales for the top-5 products by total units
    conn = get_db()
    c    = conn.cursor()

    c.execute("""
        SELECT product_id, SUM(units_sold) AS total
        FROM sales
        WHERE company_id = ?
        GROUP BY product_id
        ORDER BY total DESC
        LIMIT 5
    """, (company_id,))
    top5 = [r['product_id'] for r in c.fetchall()]

    c.execute("""
        SELECT MAX(date) FROM sales
        WHERE company_id = ?
    """, (company_id,))
    max_date = c.fetchone()[0]

    data = {}
    for pid in top5:
        c.execute("""
            SELECT p.product_name, s.date, s.units_sold
            FROM sales s
            JOIN products p ON s.product_id = p.product_id
            WHERE s.product_id = ?
              AND s.company_id = ?
              AND p.company_id = ?
              AND s.date >= DATE(?, '-30 days')
            ORDER BY s.date ASC
        """, (pid, company_id, company_id, max_date))
        rows = c.fetchall()
        if rows:
            name = rows[0]['product_name']
            data[name] = {
                'dates':  [r['date']       for r in rows],
                'units':  [r['units_sold'] for r in rows],
            }

    conn.close()
    return jsonify(data)


@api.route('/analytics/forecast-vs-actual')
def analytics_forecast_vs_actual():
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    c.execute("""
        SELECT p.product_name, e.predicted_demand, e.actual_demand, e.accuracy_pct
        FROM evaluation e
        JOIN products p ON e.product_id = p.product_id
        WHERE e.company_id = ?
          AND p.company_id = ?
          AND e.eval_id IN (
            SELECT MAX(eval_id) FROM evaluation
            WHERE company_id = ?
            GROUP BY product_id
        )
        ORDER BY p.product_name
    """, (company_id, company_id, company_id))
    rows = [row_to_dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)


@api.route('/analytics/inventory')
def analytics_inventory():
    err = login_required()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    c.execute("""
        SELECT p.product_name, i.stock_on_hand,
               f.reorder_point, f.safety_stock, f.risk_flag
        FROM inventory i
        JOIN products p ON i.product_id = p.product_id
        LEFT JOIN (
            SELECT product_id, reorder_point, safety_stock, risk_flag
            FROM forecast
            WHERE company_id = ?
              AND rec_id IN (
                SELECT MAX(rec_id) FROM forecast
                WHERE company_id = ?
                GROUP BY product_id
            )
        ) f ON i.product_id = f.product_id
        WHERE i.company_id = ? AND p.company_id = ?
        ORDER BY i.stock_on_hand DESC
    """, (company_id, company_id, company_id, company_id))
    rows = [row_to_dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)


# ── evaluation (manager only) ──────────────────────────────────────────────────

@api.route('/evaluation')
def get_evaluation():
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    c.execute("""
        SELECT p.product_name, p.category,
               e.predicted_demand, e.actual_demand,
               e.mae, e.rmse, e.bias, e.mase, e.tracking_signal,
               e.accuracy_pct, e.eval_period, e.naive_mae, e.naive_mase
        FROM evaluation e
        JOIN products p ON e.product_id = p.product_id
        WHERE e.company_id = ?
          AND p.company_id = ?
          AND e.eval_id IN (
            SELECT MAX(eval_id) FROM evaluation
            WHERE company_id = ?
            GROUP BY product_id
        )
        ORDER BY e.accuracy_pct DESC
    """, (company_id, company_id, company_id))
    rows = [row_to_dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)


@api.route('/classification')
def get_classification():
    """Return ABC-XYZ classification for all active products (manager only)."""
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    c.execute("""
        SELECT p.product_name, p.category, p.price,
               cl.abc_class, cl.xyz_class, cl.combined_class,
               cl.revenue_contribution, cl.cv,
               cl.review_frequency, cl.strategy, cl.classified_at
        FROM product_classification cl
        JOIN products p ON cl.product_id = p.product_id
        WHERE cl.company_id = ? AND p.company_id = ?
        ORDER BY cl.abc_class, cl.xyz_class, p.product_name
    """, (company_id, company_id))
    rows = [row_to_dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)


# ── scenario (manager only) ────────────────────────────────────────────────────

@api.route('/scenario')
def get_scenario():
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    results = load_scenario_results(company_id=company_id)
    return jsonify(results)


@api.route('/scenario', methods=['POST'])
@api.route('/scenario/run', methods=['POST'])
def run_scenario_custom():
    """
    Interactive scenario builder — run a custom simulation without touching the DB.

    Body (JSON):
      demand_shock   float  — demand multiplier, e.g. 1.30 = +30%, 0.80 = -20%
      lead_time      int    — supplier lead time in days (default 7)
      horizon        int    — simulation horizon in days (30 / 60 / 90)
      product_ids    list   — optional list of product_ids; omit = all active
    """
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    body          = request.get_json(silent=True) or {}
    demand_shock  = max(0.1, min(5.0, float(body.get('demand_shock', 1.0))))
    lead_time     = max(1, min(60, int(body.get('lead_time', 7))))
    horizon       = max(7, min(180, int(body.get('horizon', 90))))
    product_ids   = body.get('product_ids') or []

    conn = get_db()
    c    = conn.cursor()

    if product_ids:
        placeholders = ','.join('?' * len(product_ids))
        c.execute(f"""
            SELECT p.product_id, p.product_name,
                   f.reorder_point, f.order_quantity, i.stock_on_hand
            FROM products p
            JOIN forecast  f ON p.product_id = f.product_id
            JOIN inventory i ON p.product_id = i.product_id
            WHERE p.company_id = ? AND f.company_id = ? AND i.company_id = ?
              AND p.is_active = 1 AND p.product_id IN ({placeholders})
              AND f.rec_id IN (
                  SELECT MAX(rec_id) FROM forecast
                  WHERE company_id = ?
                  GROUP BY product_id
              )
        """, [company_id, company_id, company_id, *product_ids, company_id])
    else:
        c.execute("""
            SELECT p.product_id, p.product_name,
                   f.reorder_point, f.order_quantity, i.stock_on_hand
            FROM products p
            JOIN forecast  f ON p.product_id = f.product_id
            JOIN inventory i ON p.product_id = i.product_id
            WHERE p.company_id = ? AND f.company_id = ? AND i.company_id = ?
              AND p.is_active = 1
              AND f.rec_id IN (
                  SELECT MAX(rec_id) FROM forecast
                  WHERE company_id = ?
                  GROUP BY product_id
              )
        """, (company_id, company_id, company_id, company_id))
    products = c.fetchall()

    from services.scenario_service import _simulate

    results = []
    for p in products:
        pid = p['product_id']
        c.execute("""
            SELECT units_sold FROM sales
            WHERE product_id = ? AND company_id = ? ORDER BY date DESC LIMIT ?
        """, (pid, company_id, horizon))
        raw_sales = [r['units_sold'] for r in reversed(c.fetchall())]

        if len(raw_sales) < max(7, horizon // 3):
            continue

        # Apply demand shock
        sales = [max(0, round(v * demand_shock)) for v in raw_sales[:horizon]]

        reorder_pt = max(float(p['reorder_point'] or 1), 1.0)
        order_qty  = max(int(p['order_quantity'] or 1), 1)
        init_stock = max(int(p['stock_on_hand']), 10)

        def sim(reactive):
            stock = init_stock; so = 0; ov = 0; ro = 0; pq = 0; pi = 0
            for units in sales:
                if pi > 0:
                    pi -= 1
                    if pi == 0:
                        stock += pq; pq = 0
                if pq == 0:
                    trigger = (stock <= 0) if reactive else (stock <= reorder_pt)
                    if trigger:
                        pq = order_qty; pi = lead_time; ro += 1
                if stock >= units:
                    stock -= units
                else:
                    so += 1; stock = 0
                if reorder_pt > 0 and stock > reorder_pt * 3:
                    ov += 1
            return {'stockout_days': so, 'overstock_days': ov, 'total_reorders': ro, 'final_stock': stock}

        without = sim(True)
        with_s  = sim(False)

        results.append({
            'product_id':   pid,
            'product_name': p['product_name'],
            'without_system': without,
            'with_system':    with_s,
            'adjusted_order_qty': max(1, round(order_qty * demand_shock)),
            'improvement': {
                'stockout_reduction':  without['stockout_days']  - with_s['stockout_days'],
                'overstock_reduction': without['overstock_days'] - with_s['overstock_days'],
            },
            'params': {'demand_shock': demand_shock, 'lead_time': lead_time, 'horizon': horizon},
        })

    conn.close()
    return jsonify(results)


# ── overview summary ───────────────────────────────────────────────────────────

@api.route('/overview')
def get_overview():
    import math
    err = login_required()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()

    # ── Basic counts ──────────────────────────────────────────────────────────
    c.execute("SELECT COUNT(*) AS n FROM products WHERE company_id = ?", (company_id,))
    total_products = c.fetchone()['n']

    c.execute("SELECT COUNT(*) AS n FROM products WHERE company_id = ? AND is_active = 1", (company_id,))
    active_products = c.fetchone()['n']

    c.execute("""
        SELECT d.action, COUNT(*) AS n
        FROM decisions d
        WHERE d.company_id = ?
          AND d.decision_id IN (
            SELECT MAX(decision_id) FROM decisions
            WHERE company_id = ?
            GROUP BY product_id
        )
        GROUP BY d.action
    """, (company_id, company_id))
    decision_counts = {r['action']: r['n'] for r in c.fetchall()}

    c.execute("""
        SELECT f.risk_flag, COUNT(*) AS n
        FROM forecast f
        WHERE f.company_id = ?
          AND f.rec_id IN (
            SELECT MAX(rec_id) FROM forecast
            WHERE company_id = ?
            GROUP BY product_id
        )
        GROUP BY f.risk_flag
    """, (company_id, company_id))
    risk_counts = {r['risk_flag']: r['n'] for r in c.fetchall()}

    # ── Legacy alerts (kept for backward compat) ──────────────────────────────
    c.execute(
        """
        SELECT p.product_name, d.action, d.created_at
        FROM decisions d
        JOIN products p ON p.product_id = d.product_id
        WHERE d.company_id = ? AND p.company_id = ?
          AND d.action IN ('REORDER', 'AT_RISK')
          AND d.decision_id IN (
            SELECT MAX(decision_id) FROM decisions
            WHERE company_id = ?
            GROUP BY product_id
          )
        ORDER BY CASE d.action WHEN 'REORDER' THEN 1 ELSE 2 END, p.product_name
        LIMIT 8
        """,
        (company_id, company_id, company_id),
    )
    alerts = [row_to_dict(r) for r in c.fetchall()]

    c.execute("""
        SELECT SUM(i.stock_on_hand * COALESCE(NULLIF(p.purchase_cost, 0), p.price, 0)) AS inventory_value
        FROM inventory i
        JOIN products p ON i.product_id = p.product_id
        WHERE i.company_id = ? AND p.company_id = ? AND p.is_active = 1
    """, (company_id, company_id))
    inv_value = c.fetchone()['inventory_value'] or 0

    # ── Urgent Actions — REORDER products enriched with stock + forecast ──────
    c.execute("""
        SELECT p.product_id, p.product_name,
               i.stock_on_hand,
               f.forecast_demand, f.reorder_point, f.order_quantity,
               f.stockout_prob, f.trend_direction,
               d.reason
        FROM decisions d
        JOIN products  p ON p.product_id = d.product_id
        JOIN inventory i ON i.product_id = d.product_id AND i.company_id = d.company_id
        JOIN forecast  f ON f.product_id = d.product_id AND f.company_id = d.company_id
        WHERE d.company_id = ? AND p.company_id = ?
          AND d.action = 'REORDER'
          AND d.decision_id IN (
            SELECT MAX(decision_id) FROM decisions WHERE company_id = ? GROUP BY product_id
          )
          AND f.rec_id IN (
            SELECT MAX(rec_id) FROM forecast WHERE company_id = ? GROUP BY product_id
          )
        ORDER BY i.stock_on_hand ASC
        LIMIT 6
    """, (company_id, company_id, company_id, company_id))
    urgent_rows = c.fetchall()

    urgent_actions = []
    for row in urgent_rows:
        fd = max(float(row['forecast_demand'] or 1), 0.1)
        stock = float(row['stock_on_hand'] or 0)
        days_left = int(round(stock / fd)) if fd > 0 else 0
        urgent_actions.append({
            'product_id':      row['product_id'],
            'product_name':    row['product_name'],
            'stock_on_hand':   int(stock),
            'days_to_stockout': max(days_left, 0),
            'reorder_qty':     int(round(float(row['order_quantity'] or 0))),
            'stockout_prob':   round(float(row['stockout_prob'] or 0), 1),
            'trend_direction': row['trend_direction'] or 'STABLE',
        })

    # ── Smart AI Recommendations ──────────────────────────────────────────────
    smart_recommendations = []
    for u in urgent_actions:
        d2s = u['days_to_stockout']
        timing = f"in approximately {d2s} day{'s' if d2s != 1 else ''}" if d2s > 0 else "imminently"
        trend_note = ''
        if u['trend_direction'] == 'INCREASING':
            trend_note = ' Demand is trending upward — consider ordering more than the EOQ.'
        elif u['trend_direction'] == 'DECREASING':
            trend_note = ' Demand is declining — verify the recommendation before ordering.'
        smart_recommendations.append({
            'product_name': u['product_name'],
            'text': (
                f"{u['product_name']} is projected to stock out {timing} "
                f"(current stock: {u['stock_on_hand']} units, stockout probability: {u['stockout_prob']}%). "
                f"Recommended order quantity: {u['reorder_qty']} units (EOQ-based).{trend_note}"
            ),
            'urgency': 'critical' if d2s <= 3 else 'warning' if d2s <= 7 else 'moderate',
        })

    # ── Recent Activity feed ──────────────────────────────────────────────────
    activity = []

    # Recent REORDER decisions
    c.execute("""
        SELECT p.product_name, d.action, d.created_at
        FROM decisions d
        JOIN products p ON p.product_id = d.product_id
        WHERE d.company_id = ? AND p.company_id = ?
          AND d.action IN ('REORDER', 'AT_RISK')
        ORDER BY d.decision_id DESC
        LIMIT 4
    """, (company_id, company_id))
    for row in c.fetchall():
        action = row['action']
        ts = (row['created_at'] or '')[:16]
        activity.append({
            'type':    'alert' if action == 'REORDER' else 'warning',
            'message': f"Stock alert triggered for {row['product_name']}",
            'time':    ts,
            'icon':    'alert-triangle',
        })

    # Recent uploads
    c.execute("""
        SELECT filename, uploaded_by, rows_inserted, uploaded_at
        FROM upload_log
        WHERE company_id = ?
        ORDER BY log_id DESC
        LIMIT 3
    """, (company_id,))
    for row in c.fetchall():
        ts = (row['uploaded_at'] or '')[:16]
        activity.append({
            'type':    'upload',
            'message': f"Sales data uploaded: {row['rows_inserted']} rows added",
            'time':    ts,
            'icon':    'upload-cloud',
        })

    # Recent reorder actions logged by managers
    try:
        c.execute("""
            SELECT rl.ordered_at, p.product_name, rl.quantity_ordered,
                   rl.ordered_by, rl.status
            FROM reorder_log rl
            JOIN products p ON rl.product_id = p.product_id
            WHERE rl.company_id = ?
            ORDER BY rl.log_id DESC
            LIMIT 3
        """, (company_id,))
        for row in c.fetchall():
            ts = (row['ordered_at'] or '')[:16]
            verb = 'delivered' if row['status'] == 'delivered' else 'placed'
            activity.append({
                'type':    'reorder',
                'message': f"Reorder {verb}: {row['quantity_ordered']} units of {row['product_name']} by {row['ordered_by']}",
                'time':    ts,
                'icon':    'shopping-cart',
            })
    except Exception:
        pass

    # Recent forecast runs (last forecast record per company)
    c.execute("""
        SELECT MAX(created_at) AS last_run FROM forecast WHERE company_id = ?
    """, (company_id,))
    frow = c.fetchone()
    if frow and frow['last_run']:
        ts = frow['last_run'][:16]
        activity.append({
            'type':    'forecast',
            'message': 'Forecast models recalculated for all products',
            'time':    ts,
            'icon':    'trending-up',
        })

    # Sort by time descending, cap at 6
    activity.sort(key=lambda x: x['time'], reverse=True)
    activity = activity[:6]

    # ── KPI Trends — last 7 days vs prior 7 days ──────────────────────────────
    # Use max sales date as reference so historical datasets show meaningful trends
    c.execute("SELECT MAX(date) AS mx FROM sales WHERE company_id = ?", (company_id,))
    _max_date_row = c.fetchone()
    _max_date = _max_date_row['mx'] if _max_date_row and _max_date_row['mx'] else None

    if _max_date:
        c.execute("""
            SELECT COALESCE(SUM(units_sold), 0) AS total
            FROM sales s
            JOIN products p ON p.product_id = s.product_id
            WHERE s.company_id = ? AND p.is_active = 1
              AND s.date >= DATE(?, '-7 days')
        """, (company_id, _max_date))
        sales_last7 = float(c.fetchone()['total'] or 0)

        c.execute("""
            SELECT COALESCE(SUM(units_sold), 0) AS total
            FROM sales s
            JOIN products p ON p.product_id = s.product_id
            WHERE s.company_id = ? AND p.is_active = 1
              AND s.date >= DATE(?, '-14 days')
              AND s.date < DATE(?, '-7 days')
        """, (company_id, _max_date, _max_date))
        sales_prev7 = float(c.fetchone()['total'] or 0)
    else:
        sales_last7 = 0.0
        sales_prev7 = 0.0

    def trend_pct(cur, prev):
        if prev == 0:
            return 0.0
        return round((cur - prev) / prev * 100, 1)

    sales_trend = trend_pct(sales_last7, sales_prev7)

    # Reorder count trend (current vs 7 days ago — approximate by comparing decision timestamps)
    reorder_count = decision_counts.get('REORDER', 0)
    at_risk_count = decision_counts.get('AT_RISK', 0)

    # ── First visit flag ──────────────────────────────────────────────────────
    is_first_visit = (total_products == 0)

    c.execute("SELECT currency_symbol FROM companies WHERE company_id = ?", (company_id,))
    currency_row = c.fetchone()
    currency_symbol = currency_row['currency_symbol'] if currency_row and currency_row['currency_symbol'] else '£'

    # ── Last forecast run timestamp ───────────────────────────────────────────
    c.execute("SELECT MAX(created_at) AS lr FROM forecast WHERE company_id = ?", (company_id,))
    fr = c.fetchone()
    last_forecast_run = fr['lr'] if fr and fr['lr'] else None

    # ── Pending reorder orders count ──────────────────────────────────────────
    pending_reorders_count = 0
    try:
        c.execute(
            "SELECT COUNT(*) AS n FROM reorder_log WHERE company_id = ? AND status = 'pending'",
            (company_id,),
        )
        pending_reorders_count = c.fetchone()['n']
    except Exception:
        pass

    # ── Data quality signals ─────────────────────────────────────────────────
    c.execute("SELECT COUNT(*) AS n FROM sales WHERE company_id = ?", (company_id,))
    sales_rows = c.fetchone()['n']

    c.execute("""
        SELECT COUNT(*) AS n
        FROM products p
        LEFT JOIN inventory i
          ON i.product_id = p.product_id AND i.company_id = p.company_id
        WHERE p.company_id = ?
          AND p.is_active = 1
          AND (i.stock_on_hand IS NULL OR i.stock_on_hand < 0)
    """, (company_id,))
    products_missing_inventory = c.fetchone()['n']

    c.execute("""
        SELECT COUNT(*) AS n
        FROM (
            SELECT p.product_id, COUNT(s.date) AS sale_rows
            FROM products p
            LEFT JOIN sales s
              ON s.product_id = p.product_id AND s.company_id = p.company_id
            WHERE p.company_id = ? AND p.is_active = 1
            GROUP BY p.product_id
            HAVING sale_rows > 0 AND sale_rows < 30
        ) low_history
    """, (company_id,))
    products_low_history = c.fetchone()['n']

    quality_issues = []
    if total_products == 0:
        quality_issues.append('No products have been uploaded yet.')
    if sales_rows == 0:
        quality_issues.append('No sales rows are available for forecasting.')
    elif sales_rows < 30:
        quality_issues.append('Forecasts may be weak because fewer than 30 sales rows are available.')
    if products_low_history:
        quality_issues.append(f'{products_low_history} active product(s) have fewer than 30 sales rows.')
    if products_missing_inventory:
        quality_issues.append(f'{products_missing_inventory} active product(s) are missing usable stock levels.')

    if not quality_issues:
        quality_status = 'good'
        quality_summary = 'Data coverage looks ready for daily decisions.'
    elif sales_rows == 0 or total_products == 0:
        quality_status = 'critical'
        quality_summary = 'Upload sales and inventory data before trusting recommendations.'
    else:
        quality_status = 'warning'
        quality_summary = 'Recommendations are usable, but a few data gaps need attention.'

    conn.close()

    return jsonify({
        'total_products':        total_products,
        'active_products':       active_products,
        'decision_counts':       decision_counts,
        'risk_counts':           risk_counts,
        'alerts':                alerts,
        'inventory_value':       round(inv_value, 2),
        'urgent_actions':        urgent_actions,
        'smart_recommendations': smart_recommendations,
        'activity':              activity,
        'kpi_trends': {
            'sales_trend':   sales_trend,
            'reorder_count': reorder_count,
            'at_risk_count': at_risk_count,
        },
        'is_first_visit':          is_first_visit,
        'last_forecast_run':       last_forecast_run,
        'pending_reorders_count':  pending_reorders_count,
        'currency_symbol':         currency_symbol,
        'data_quality': {
            'status': quality_status,
            'summary': quality_summary,
            'issues': quality_issues,
            'sales_rows': sales_rows,
            'products_low_history': products_low_history,
            'products_missing_inventory': products_missing_inventory,
        },
    })


# ── Upload — smart, schema-flexible (CSV + XLSX) ──────────────────────────────
#
# Handles ANY retail spreadsheet regardless of column naming or date format.
# Strategy:
#   1. Auto-detect date / product / units / stock columns via alias matching
#   2. Normalise dates across 12+ formats (ISO, UK, US, datetime strings)
#   3. Auto-create products that don't exist yet (category = 'Imported')
#   4. Skip negative quantities (returns / refunds) with a counter
#   5. DEDUPLICATE: skip (product, date) pairs already in the database
#   6. Update stock_on_hand if a stock column is present (uses latest-dated row)
#   7. Preview endpoint returns detected mapping + sample rows before committing
#
# Recognised column aliases
_DATE_ALIASES    = {'date','Date','sale_date','saledate','invoice_date','invoicedate',
                    'transaction_date','transactiondate','order_date','orderdate',
                    'purchase_date','day','InvoiceDate','invoice date','sale date',
                    'solddate','sold_date','timestamp','time stamp','sale time',
                    'event time','event_time','order time','order_time','created_at',
                    'created at','transaction time','transaction_time','invoice_date'}
_PRODUCT_ALIASES = {'product_name','productname','product','item','item_name','itemname',
                    'description','Description','product_description','name','Name',
                    'Product Name','Product','Item','Item Name','StockCode','stock_code',
                    'sku','SKU','article','Article','Product Description','product desc',
                    'prod_name','prod name','product title','title',
                    'product id','product_id','item id','item_id','productid',
                    'prod_id','prod id','asin','barcode','upc'}
_UNITS_ALIASES   = {'units_sold','unitssold','quantity','qty','Quantity','Qty','units',
                    'Units','sales','Sales','amount','count','sold','Quantity Sold',
                    'quantity_sold','vol','volume','num_sold','number_sold','no_sold',
                    'items_sold','transactions','Units Sold'}
_PRICE_ALIASES   = {'price','Price','unit_price','unitprice','UnitPrice','cost',
                    'unit_cost','retail_price','sale_price','item_price','price each',
                    'unit price','selling_price','selling price'}
_STOCK_ALIASES   = {'stock_on_hand','stock','current_stock','inventory','stock_level',
                    'on_hand','onhand','closing_stock','balance','stock_balance',
                    'current_inventory','inventory_level','stock_qty','remaining'}

# Interaction log detection — if these columns exist it's an event log, not a sales summary
_INTERACTION_ALIASES = {'interaction_type','interactiontype','event_type','eventtype',
                        'event','action','activity','interaction','behavior','behaviour',
                        'event_name','type','interaction type','event type',
                        'activity type','behavior type','action type','event category'}
_PURCHASE_KEYWORDS   = {'purchase','buy','bought','order','checkout','sale','sold',
                        'transaction','purchase_event','buy_event','add_to_cart_and_buy',
                        'ordered','paid','conversion','complete','completed',
                        'order_placed','placed order','payment'}


def _is_purchase_event(val):
    """Return True if an interaction-type value represents a purchase."""
    return str(val).strip().lower() in _PURCHASE_KEYWORDS


def _aggregate_interaction_log(rows, hmap):
    """
    Convert an interaction log (one row per event) into aggregated sales rows.
    Groups by (product, date) where interaction_type is a purchase keyword.
    Returns (new_rows, interaction_col, original_product_col, original_date_col)
    """
    date_col        = _match_col(hmap, _DATE_ALIASES)
    product_col     = _match_col(hmap, _PRODUCT_ALIASES)
    interaction_col = _match_col(hmap, _INTERACTION_ALIASES)
    price_col       = _match_col(hmap, _PRICE_ALIASES)

    if not date_col or not product_col or not interaction_col:
        return None, interaction_col, product_col, date_col

    # Aggregate: count purchase events per (product, date)
    counts = {}
    prices = {}
    for row in rows:
        int_val = str(row.get(interaction_col, '') or '').strip()
        if not _is_purchase_event(int_val):
            continue
        date_raw    = str(row.get(date_col,    '') or '').strip()
        product_raw = str(row.get(product_col, '') or '').strip()
        if not date_raw or not product_raw:
            continue
        date_val = _normalise_date(date_raw)
        if not date_val:
            continue
        key = (product_raw, date_val)
        counts[key] = counts.get(key, 0) + 1
        if price_col and key not in prices:
            try:
                prices[key] = float(str(row.get(price_col, '') or '').replace('£','').replace('$','').replace(',','').strip())
            except ValueError:
                pass

    # Rebuild as synthetic rows with standard column names
    synthetic = []
    for (product_raw, date_val), units in counts.items():
        r = {'date': date_val, 'product_name': product_raw, 'units_sold': units}
        if price_col and (product_raw, date_val) in prices:
            r['price'] = prices[(product_raw, date_val)]
        synthetic.append(r)

    return synthetic, interaction_col, product_col, date_col

_DATE_FORMATS = [
    '%Y-%m-%d','%d/%m/%Y','%m/%d/%Y','%d-%m-%Y','%m-%d-%Y','%Y/%m/%d',
    '%d %b %Y','%d %B %Y','%B %d %Y','%b %d %Y',
    '%Y-%m-%d %H:%M:%S','%Y-%m-%dT%H:%M:%S','%d/%m/%Y %H:%M',
    '%m/%d/%Y %H:%M','%m/%d/%Y %H:%M:%S','%d/%m/%Y %H:%M:%S',
    '%Y-%m-%d %H:%M','%d-%m-%Y %H:%M:%S',
]


def _match_col(headers_lower_map, aliases):
    """Return the original header name whose lowercase form is in aliases, or None."""
    for alias in aliases:
        if alias.lower() in headers_lower_map:
            return headers_lower_map[alias.lower()]
    return None


def _fuzzy_match_col(hmap, col_type):
    """
    Substring fallback when no exact alias matches.
    Checks if a column name *contains* a type-specific keyword
    and does not contain a keyword that clearly belongs to another type.
    """
    _HINTS = {
        'date': (
            ['date', 'dt', 'stamp', 'when'],
            ['name', 'product', 'item', 'price', 'cost', 'qty', 'stock',
             'unit', 'sold', 'count', 'num', 'vol', 'id'],
        ),
        'product': (
            ['name', 'product', 'item', 'sku', 'code', 'desc', 'title', 'article'],
            ['date', 'time', 'qty', 'unit', 'sold', 'price', 'cost', 'money',
             'amount', 'cash', 'card', 'stock', 'total', 'revenue', 'count', 'id'],
        ),
        'units': (
            ['qty', 'quant', 'unit', 'sold', 'count', 'num', 'vol'],
            ['date', 'time', 'name', 'product', 'item', 'price', 'cost',
             'stock', 'cash', 'card', 'money', 'id'],
        ),
        'price': (
            ['price', 'cost', 'rate', 'money', 'amount', 'revenue', 'value'],
            ['date', 'time', 'name', 'product', 'item', 'stock', 'qty'],
        ),
        'stock': (
            ['stock', 'inventory', 'balance', 'remain', 'on_hand', 'onhand'],
            ['date', 'time', 'name', 'product', 'price', 'cost', 'qty', 'sold'],
        ),
    }
    hints, exclude = _HINTS.get(col_type, ([], []))
    for lower_key, orig_key in hmap.items():
        if any(ex in lower_key for ex in exclude):
            continue
        if any(hint in lower_key for hint in hints):
            return orig_key
    return None


def _aggregate_as_transaction_log(rows, date_col, product_col, price_col):
    """
    Each row is one transaction (no explicit quantity).
    Count occurrences per (product, date) and return synthetic rows
    with standard column names ready for _parse_stream.
    """
    counts = {}
    prices = {}
    for row in rows:
        date_raw = str(row.get(date_col, '') or '').strip()
        prod_raw = str(row.get(product_col, '') or '').strip()
        if not date_raw or not prod_raw:
            continue
        date_val = _normalise_date(date_raw)
        if not date_val:
            continue
        key = (prod_raw, date_val)
        counts[key] = counts.get(key, 0) + 1
        if price_col and key not in prices:
            try:
                prices[key] = float(
                    str(row.get(price_col, '') or '')
                    .replace('£', '').replace('$', '').replace(',', '').strip()
                )
            except (ValueError, AttributeError):
                pass
    synthetic = []
    for (prod_raw, date_val), count in counts.items():
        r = {'date': date_val, 'product_name': prod_raw, 'units_sold': count}
        if price_col and (prod_raw, date_val) in prices:
            r['price'] = prices[(prod_raw, date_val)]
        synthetic.append(r)
    new_headers = ['date', 'product_name', 'units_sold']
    if price_col:
        new_headers.append('price')
    return synthetic, new_headers


def _normalise_date(raw):
    """Try every known format; return YYYY-MM-DD string or None."""
    raw = raw.strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(raw, fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    if date_parser is not None:
        try:
            return date_parser.parse(raw, dayfirst=True).strftime('%Y-%m-%d')
        except Exception:
            pass
    return None


def _decode_csv_bytes(raw):
    """Decode uploaded bytes across common encodings."""
    for enc in ('utf-8-sig', 'utf-16', 'latin-1'):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode('utf-8', errors='ignore')


def _sniff_reader(text):
    """Build DictReader with delimiter auto-detection."""
    sample = text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=',;\t|')
        return csv.DictReader(io.StringIO(text), dialect=dialect)
    except Exception:
        return csv.DictReader(io.StringIO(text))


def _parse_units(units_raw):
    s = str(units_raw).strip()
    if not s:
        raise ValueError('empty quantity')
    s = s.replace(' ', '')
    if ',' in s and '.' in s:
        if s.rfind(',') > s.rfind('.'):
            s = s.replace('.', '').replace(',', '.')
        else:
            s = s.replace(',', '')
    elif ',' in s:
        parts = s.split(',')
        if len(parts[-1]) in (1, 2):
            s = s.replace(',', '.')
        else:
            s = s.replace(',', '')
    return int(float(s))


def _xlsx_to_dictrows(raw_bytes):
    """Parse an xlsx file; return (headers, list_of_dicts)."""
    try:
        import openpyxl
    except ImportError:
        raise ValueError('openpyxl not installed — cannot read .xlsx files')
    wb = openpyxl.load_workbook(io.BytesIO(raw_bytes), read_only=True, data_only=True)
    ws = wb.active
    all_rows = list(ws.iter_rows(values_only=True))
    wb.close()
    if not all_rows:
        return [], []
    headers = [str(h).strip() if h is not None else f'col_{i}' for i, h in enumerate(all_rows[0])]
    dict_rows = []
    for row in all_rows[1:]:
        if all(cell is None for cell in row):
            continue
        dict_rows.append({headers[i]: ('' if cell is None else str(cell)) for i, cell in enumerate(row)})
    return headers, dict_rows


def _parse_stream(rows_iter, raw_headers, name_map, c, company_id, auto_create=True, write_rows=True):
    """
    Parse an iterable of dicts (from CSV DictReader or xlsx). Supports:
      - Standard sales format: date, product, units_sold (one row per day per product)
      - Interaction log format: timestamp, product_id, interaction_type (one row per event)
        → auto-detected, purchase events aggregated into daily unit counts

    Returns:
      rows_inserted, new_products, skipped_returns, skipped_duplicates,
      inventory_updates, parse_errors, detected_cols, sample_rows, affected_product_ids
    """
    # Materialise so we can inspect for format detection
    rows = list(rows_iter)
    hmap = {h.strip().lower(): h.strip() for h in raw_headers}

    # ── Interaction-log auto-detection ────────────────────────────────────────
    # If dataset has an interaction_type column but no units column, treat it as
    # an event log and aggregate purchase events into daily unit counts.
    interaction_col_raw = _match_col(hmap, _INTERACTION_ALIASES)
    has_units           = bool(_match_col(hmap, _UNITS_ALIASES))
    format_used         = 'standard'

    if interaction_col_raw and not has_units and rows:
        aggregated, int_col, prod_col, dt_col = _aggregate_interaction_log(rows, hmap)
        if aggregated:
            # Rewrite rows + headers to standard format
            rows        = aggregated
            raw_headers = ['date', 'product_name', 'units_sold', 'price']
            hmap        = {h: h for h in raw_headers}
            format_used = f'interaction-log (filtered purchase events from "{int_col}")'
        else:
            # Aggregation found the right columns but zero purchase events
            # Give an informative error
            return 0, [], 0, 0, 0, [
                f'Detected interaction log format (column "{int_col}"). '
                f'No purchase/buy events found. '
                f'Values seen in "{int_col}": check that purchase events are labelled '
                f'"purchase", "buy", "order", "sale", "checkout", or similar.'
            ], {'all_headers': list(raw_headers), 'format': 'interaction-log',
                'date': dt_col, 'product': prod_col, 'units': None, 'price': None,
                'stock': None}, [], set()

    date_col    = _match_col(hmap, _DATE_ALIASES)    or _fuzzy_match_col(hmap, 'date')
    product_col = _match_col(hmap, _PRODUCT_ALIASES) or _fuzzy_match_col(hmap, 'product')
    units_col   = _match_col(hmap, _UNITS_ALIASES)   or _fuzzy_match_col(hmap, 'units')
    price_col   = _match_col(hmap, _PRICE_ALIASES)   or _fuzzy_match_col(hmap, 'price')
    stock_col   = _match_col(hmap, _STOCK_ALIASES)   or _fuzzy_match_col(hmap, 'stock')

    # Transaction log: date + product found but no quantity column →
    # treat every row as one sale and aggregate daily counts per product.
    if date_col and product_col and not units_col:
        rows, raw_headers = _aggregate_as_transaction_log(rows, date_col, product_col, price_col)
        hmap        = {h: h for h in raw_headers}
        date_col    = 'date'
        product_col = 'product_name'
        units_col   = 'units_sold'
        price_col   = 'price' if price_col and 'price' in raw_headers else None
        stock_col   = None
        format_used = 'transaction-log (each row = 1 sale, aggregated by product + date)'

    detected_cols = {
        'date':    date_col,
        'product': product_col,
        'units':   units_col,
        'price':   price_col,
        'stock':   stock_col,
        'format':  format_used,
        'all_headers': list(raw_headers),
    }

    if not date_col or not product_col or not units_col:
        missing = []
        if not date_col:    missing.append('date')
        if not product_col: missing.append('product/item name')
        if not units_col:   missing.append('quantity/units_sold')
        tip = (
            'Tip: rename your columns to date, product_name, units_sold '
            '(or variants like Date, Item, Quantity). '
            'If this is an e-commerce interaction log with an event type column, '
            'ensure purchase events are labelled "purchase", "buy", "order", or "sale".'
        )
        return 0, [], 0, 0, 0, [
            f'Could not detect required columns: {", ".join(missing)}. '
            f'Found: {", ".join(raw_headers) or "(none)"}. {tip}'
        ], detected_cols, [], set()

    # Load existing (product_id, date) pairs to prevent duplicates
    existing_pairs = set()
    if write_rows and name_map:
        known_pids = [v for v in name_map.values() if v > 0]
        if known_pids:
            placeholders = ','.join('?' * len(known_pids))
            c.execute(
                f'SELECT product_id, date FROM sales WHERE company_id = ? AND product_id IN ({placeholders})',
                [company_id, *known_pids],
            )
            for r in c.fetchall():
                existing_pairs.add((r[0], r[1]))

    rows_inserted      = 0
    new_products       = []
    skipped_returns    = 0
    skipped_duplicates = 0
    parse_errors       = []
    sample_rows        = []
    new_pairs          = set()
    affected_pids      = set()
    # Track latest stock value per product_id for inventory update
    latest_stock       = {}  # pid → (date_val, stock_value)

    for i, row in enumerate(rows, start=2):
        try:
            date_raw    = str(row.get(date_col,    '') or '').strip()
            product_raw = str(row.get(product_col, '') or '').strip()
            units_raw   = str(row.get(units_col,   '') or '').strip()

            if not date_raw or not product_raw or not units_raw:
                continue

            date_val = _normalise_date(date_raw)
            if date_val is None:
                parse_errors.append(f'Row {i}: unrecognised date "{date_raw}"')
                if len(parse_errors) >= 5:
                    parse_errors.append('… (further date errors suppressed)')
                    break
                continue

            try:
                units = _parse_units(units_raw)
            except ValueError:
                parse_errors.append(f'Row {i}: invalid quantity "{units_raw}"')
                continue
            if units <= 0:
                skipped_returns += 1
                continue

            # Resolve product → id
            key = product_raw.lower()
            if key not in name_map:
                if not auto_create:
                    continue
                if write_rows:
                    price = 0.0
                    if price_col and row.get(price_col):
                        try:
                            price = float(str(row[price_col]).replace('£', '').replace('$', '').replace(',', '').strip())
                        except ValueError:
                            pass
                    c.execute("""
                        INSERT INTO products (company_id, product_name, sku, category, price, is_active)
                        VALUES (?, ?, NULL, 'Imported', ?, 1)
                    """, (company_id, product_raw, round(price, 2)))
                    pid = c.lastrowid
                    c.execute("UPDATE products SET sku = ? WHERE product_id = ? AND company_id = ?", (f'SKU-{pid}', pid, company_id))
                    c.execute("""
                        INSERT OR IGNORE INTO inventory (company_id, product_id, stock_on_hand, last_updated)
                        VALUES (?, ?, 0, DATE('now'))
                    """, (company_id, pid))
                    name_map[key] = pid
                    # New product: no existing pairs to load for it
                else:
                    name_map[key] = -(len(name_map) + 1)
                new_products.append(product_raw)

            pid = name_map[key]
            if pid > 0:
                affected_pids.add(pid)

            # Deduplication
            pair = (pid, date_val)
            if pair in existing_pairs or pair in new_pairs:
                skipped_duplicates += 1
                continue

            if write_rows:
                c.execute(
                    'INSERT INTO sales (company_id, product_id, date, units_sold) VALUES (?, ?, ?, ?)',
                    (company_id, pid, date_val, units),
                )
                new_pairs.add(pair)

                # Track latest stock value per product
                if stock_col and row.get(stock_col):
                    try:
                        stock_val = int(float(str(row[stock_col]).replace(',', '').strip()))
                        if stock_val >= 0:
                            prev = latest_stock.get(pid)
                            if prev is None or date_val >= prev[0]:
                                latest_stock[pid] = (date_val, stock_val)
                    except ValueError:
                        pass
            else:
                new_pairs.add(pair)

            rows_inserted += 1
            if len(sample_rows) < 5:
                sample_rows.append({'date': date_val, 'product': product_raw, 'units': units})

        except Exception as e:
            parse_errors.append(f'Row {i}: {e}')

    # Apply stock updates from the upload
    inventory_updates = 0
    if write_rows and latest_stock:
        for pid, (_, stock_val) in latest_stock.items():
            c.execute("""
                UPDATE inventory SET stock_on_hand = ?, last_updated = DATE('now')
                WHERE company_id = ? AND product_id = ?
            """, (stock_val, company_id, pid))
            inventory_updates += 1

    return (rows_inserted, new_products, skipped_returns, skipped_duplicates,
            inventory_updates, parse_errors, detected_cols, sample_rows, affected_pids)


def _build_dictrows_from_csv(csv_text):
    """Return (headers, list_of_dicts) from CSV text."""
    reader = _sniff_reader(csv_text)
    headers = reader.fieldnames or []
    rows = list(reader)
    return headers, rows


@api.route('/upload/sample-csv')
def sample_csv():
    """Return a downloadable CSV template using the current product list."""
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    c.execute(
        "SELECT product_name FROM products WHERE company_id = ? AND is_active = 1 ORDER BY product_name LIMIT 6",
        (company_id,),
    )
    names = [r['product_name'] for r in c.fetchall()]
    conn.close()

    lines = ['date,product_name,units_sold,stock_on_hand']
    from datetime import date, timedelta
    today = date.today()
    for i in range(3):
        d = (today - timedelta(days=i)).strftime('%Y-%m-%d')
        for name in names:
            lines.append(f'{d},{name},10,')

    return Response(
        '\n'.join(lines),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=stocklens_sales_template.csv'},
    )


def _read_upload_file(file):
    """Return (headers, rows_as_dicts, total_data_rows) from a CSV or XLSX file."""
    raw = file.stream.read()
    fname = file.filename.lower()
    if fname.endswith('.xlsx') or fname.endswith('.xls'):
        headers, rows = _xlsx_to_dictrows(raw)
    else:
        csv_text = _decode_csv_bytes(raw)
        headers, rows = _build_dictrows_from_csv(csv_text)
    return headers, rows, len(rows)


@api.route('/upload/preview', methods=['POST'])
def upload_preview():
    """
    Parse uploaded files without writing to DB.
    Accepts CSV and XLSX. Returns column mapping, sample rows, new products,
    duplicate counts, and row totals so the frontend can confirm before committing.
    """
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    files = request.files.getlist('files[]') or request.files.getlist('file')
    if not files or all(f.filename == '' for f in files):
        return jsonify({'error': 'No files received.'}), 400

    conn = get_db()
    c    = conn.cursor()
    c.execute("SELECT product_id, product_name FROM products WHERE company_id = ?", (company_id,))
    name_map = {r['product_name'].lower(): r['product_id'] for r in c.fetchall()}
    conn.close()

    previews = []
    for file in files:
        fname = file.filename.lower()
        if not (fname.endswith('.csv') or fname.endswith('.xlsx') or fname.endswith('.xls')):
            previews.append({'file': file.filename, 'skipped': True, 'reason': 'Only .csv and .xlsx files are supported'})
            continue
        try:
            headers, rows, total = _read_upload_file(file)
            result = _parse_stream(
                rows, headers, dict(name_map), c, company_id, auto_create=True, write_rows=False
            )
            inserted, new_prods, skipped_ret, skipped_dups, _, errors, detected, samples, _ = result
            previews.append({
                'file':              file.filename,
                'total_rows':        total,
                'rows_importable':   inserted,
                'new_products':      new_prods,
                'skipped_returns':   skipped_ret,
                'skipped_duplicates': skipped_dups,
                'detected_cols':     detected,
                'sample_rows':       samples,
                'errors':            errors[:5],
            })
        except Exception as e:
            previews.append({'file': file.filename, 'skipped': True, 'reason': str(e)})

    return jsonify({'previews': previews})


@api.route('/upload/sales', methods=['POST'])
def upload_sales():
    """
    Accept one or more CSV or XLSX files (field name: "files[]" or "file").

    - Auto-detects date / product / units / stock / price columns
    - Parses 12+ date formats
    - Auto-creates new products (category = Imported)
    - Deduplicates: skips (product, date) rows already in the DB
    - Updates stock_on_hand if a stock column is present (uses latest-dated row)
    - Re-runs full forecast pipeline for every affected product
    - Logs each upload to upload_log table
    """
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    files = request.files.getlist('files[]') or request.files.getlist('file')
    if not files or all(f.filename == '' for f in files):
        return jsonify({'error': 'No files uploaded. Send CSV or XLSX as form-data field "files[]".'}), 400

    conn = get_db()
    c    = conn.cursor()
    c.execute("SELECT product_id, product_name FROM products WHERE company_id = ?", (company_id,))
    name_map = {r['product_name'].lower(): r['product_id'] for r in c.fetchall()}

    total_rows          = 0
    total_skipped_ret   = 0
    total_skipped_dups  = 0
    total_inv_updates   = 0
    all_new_products    = []
    affected_pids       = set()
    file_summaries      = []

    for file in files:
        fname = file.filename.lower()
        if not (fname.endswith('.csv') or fname.endswith('.xlsx') or fname.endswith('.xls')):
            file_summaries.append({'file': file.filename, 'skipped': True,
                                   'reason': 'Only .csv and .xlsx files are supported'})
            continue
        try:
            headers, rows, _ = _read_upload_file(file)
            result = _parse_stream(rows, headers, name_map, c, company_id, auto_create=True, write_rows=True)
            inserted, new_prods, skipped_ret, skipped_dups, inv_updates, errors, detected, samples, parsed_pids = result
            conn.commit()

            # Refresh name_map after potential new product inserts
            c.execute("SELECT product_id, product_name FROM products WHERE company_id = ?", (company_id,))
            name_map = {r['product_name'].lower(): r['product_id'] for r in c.fetchall()}

            # Exact affected IDs from parsed rows (new + existing products touched).
            affected_pids.update(pid for pid in parsed_pids if pid and pid > 0)

            total_rows         += inserted
            total_skipped_ret  += skipped_ret
            total_skipped_dups += skipped_dups
            total_inv_updates  += inv_updates
            all_new_products.extend(new_prods)

            # Log this file upload
            c.execute("""
                INSERT OR IGNORE INTO upload_log
                    (company_id, filename, uploaded_by, rows_inserted, new_products, skipped_duplicates, inventory_updates)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (company_id, file.filename, session.get('username', 'unknown'),
                  inserted, len(new_prods), skipped_dups, inv_updates))
            conn.commit()

            file_summaries.append({
                'file':               file.filename,
                'rows_inserted':      inserted,
                'new_products':       new_prods,
                'skipped_returns':    skipped_ret,
                'skipped_duplicates': skipped_dups,
                'inventory_updates':  inv_updates,
                'detected_cols':      detected,
                'sample_rows':        samples,
                'errors':             errors[:5],
            })
        except Exception as e:
            file_summaries.append({'file': file.filename, 'skipped': True, 'reason': str(e)})

    pipeline_job_id = None
    # Queue forecast pipeline for every affected product
    if affected_pids:
        conn.close()
        pipeline_job_id = _create_pipeline_job(company_id, product_ids=list(affected_pids))
    else:
        conn.close()

    new_unique = list(dict.fromkeys(all_new_products))

    extras = []
    if total_skipped_dups:
        extras.append(f'{total_skipped_dups} duplicate rows skipped')
    if total_skipped_ret:
        extras.append(f'{total_skipped_ret} returns/negatives skipped')
    if total_inv_updates:
        extras.append(f'{total_inv_updates} stock levels updated')

    # Cleaning summary for the UI and dissertation evidence
    cleaning_summary = {
        'rows_accepted':         total_rows,
        'duplicates_removed':    total_skipped_dups,
        'negatives_removed':     total_skipped_ret,
        'stock_levels_updated':  total_inv_updates,
        'new_products_created':  len(new_unique),
        'products_affected':     len(affected_pids),
        'pipeline_rerun':        bool(affected_pids),
        'cleaning_steps': [
            'Date normalisation (18 format variants)',
            'Column alias matching (flexible headers)',
            'Negative/return row removal',
            f'Duplicate (product, date) deduplication — {total_skipped_dups} removed',
            'Numeric type coercion and rounding',
            'Auto product creation for new items',
        ] + (['Stock-on-hand inventory update'] if total_inv_updates else []),
    }

    data_quality = _compute_data_quality(
        company_id, affected_pids, total_rows, total_skipped_dups, total_skipped_ret
    )

    return jsonify({
        'success':            total_rows > 0 or total_skipped_dups > 0,
        'files_processed':    len(file_summaries),
        'total_rows':         total_rows,
        'products_updated':   len(affected_pids),
        'new_products':       new_unique,
        'skipped_returns':    total_skipped_ret,
        'skipped_duplicates': total_skipped_dups,
        'inventory_updates':  total_inv_updates,
        'file_summaries':     file_summaries,
        'cleaning_summary':   cleaning_summary,
        'data_quality':       data_quality,
        'pipeline_job_id':     pipeline_job_id,
        'pipeline_queued':     bool(pipeline_job_id),
        'message': (
            f'Inserted {total_rows} rows across {len(affected_pids)} products'
            + (f' ({len(new_unique)} new)' if new_unique else '')
            + (f'. {"; ".join(extras)}' if extras else '')
            + ('. Forecast pipeline queued.' if pipeline_job_id else '.')
            if total_rows > 0
            else (
                f'No new rows inserted ({total_skipped_dups} duplicates already in database).'
                if total_skipped_dups
                else 'No rows inserted — check file_summaries for column detection details.'
            )
        ),
    })


@api.route('/upload/history')
def upload_history():
    """Return the last 20 upload log entries (manager only)."""
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    try:
        c.execute("""
            SELECT log_id, filename, uploaded_by, rows_inserted,
                   new_products, skipped_duplicates, inventory_updates, uploaded_at
            FROM upload_log
            WHERE company_id = ?
            ORDER BY uploaded_at DESC
            LIMIT 20
        """, (company_id,))
        rows = [row_to_dict(r) for r in c.fetchall()]
    except Exception as e:
        import traceback
        traceback.print_exc()
        rows = []
    conn.close()
    return jsonify(rows)


def run_pipeline_sync_for_company(company_id, product_ids=None):
    conn = get_db()
    c = conn.cursor()
    if product_ids:
        placeholders = ','.join('?' * len(product_ids))
        c.execute(
            f"SELECT product_id, is_active FROM products WHERE company_id = ? AND product_id IN ({placeholders}) ORDER BY product_id",
            [company_id, *list(product_ids)],
        )
    else:
        c.execute(
            "SELECT product_id, is_active FROM products WHERE company_id = ? ORDER BY product_id",
            (company_id,),
        )
    products = c.fetchall()

    if product_ids:
        for pid in product_ids:
            c.execute("DELETE FROM forecast WHERE company_id = ? AND product_id = ?", (company_id, pid))
            c.execute("DELETE FROM decisions WHERE company_id = ? AND product_id = ?", (company_id, pid))
            c.execute("DELETE FROM evaluation WHERE company_id = ? AND product_id = ?", (company_id, pid))
    else:
        c.execute("DELETE FROM forecast WHERE company_id = ?", (company_id,))
        c.execute("DELETE FROM decisions WHERE company_id = ?", (company_id,))
        c.execute("DELETE FROM evaluation WHERE company_id = ?", (company_id,))
        c.execute("DELETE FROM product_classification WHERE company_id = ?", (company_id,))
    conn.commit()
    conn.close()

    from services.forecast_service import run_forecast_for_product
    from services.decision_service import compute_decision_for_product
    from services.evaluation_service import run_evaluation_for_product
    from services.scenario_service import run_scenario_comparison
    from services.abc_xyz_service import run_classification

    for p in products:
        run_forecast_for_product(p['product_id'], p['is_active'])
        compute_decision_for_product(p['product_id'])
        if p['is_active']:
            run_evaluation_for_product(p['product_id'])

    run_scenario_comparison(company_id=company_id)
    run_classification(company_id=company_id)
    return len(products)


def _create_pipeline_job(company_id, product_ids=None):
    job_id = uuid.uuid4().hex
    conn = get_db()
    conn.execute(
        "INSERT INTO pipeline_jobs (job_id, company_id, status, message) VALUES (?, ?, 'queued', ?)",
        (job_id, company_id, 'Pipeline queued'),
    )
    conn.commit()
    conn.close()

    app = current_app._get_current_object()

    def worker():
        with app.app_context():
            conn2 = get_db()
            conn2.execute(
                "UPDATE pipeline_jobs SET status = 'running', message = 'Pipeline running', started_at = DATETIME('now') WHERE job_id = ?",
                (job_id,),
            )
            conn2.commit()
            conn2.close()
            try:
                processed = run_pipeline_sync_for_company(company_id, product_ids=product_ids)
                conn3 = get_db()
                conn3.execute(
                    """
                    UPDATE pipeline_jobs
                    SET status = 'complete', message = 'Pipeline complete', products_processed = ?,
                        finished_at = DATETIME('now')
                    WHERE job_id = ?
                    """,
                    (processed, job_id),
                )
                conn3.commit()
                conn3.close()
            except Exception as exc:
                conn3 = get_db()
                conn3.execute(
                    """
                    UPDATE pipeline_jobs
                    SET status = 'failed', message = 'Pipeline failed', error = ?,
                        finished_at = DATETIME('now')
                    WHERE job_id = ?
                    """,
                    (str(exc), job_id),
                )
                conn3.commit()
                conn3.close()

    threading.Thread(target=worker, name=f"stocklens-pipeline-{job_id[:8]}", daemon=True).start()
    return job_id


@api.route('/pipeline/run', methods=['POST'])
def run_pipeline_for_company():
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    job_id = _create_pipeline_job(company_id)
    return jsonify({'message': 'Pipeline queued', 'job_id': job_id, 'status': 'queued'}), 202


@api.route('/pipeline/jobs/<job_id>')
def get_pipeline_job(job_id):
    err = login_required()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM pipeline_jobs WHERE job_id = ? AND company_id = ?", (job_id, company_id))
    row = c.fetchone()
    conn.close()
    if not row:
        return jsonify({'message': 'Pipeline job not found'}), 404
    return jsonify(row_to_dict(row))


# ── Reorder Action Log ─────────────────────────────────────────────────────────

@api.route('/reorder/log', methods=['POST'])
def log_reorder_action():
    """
    Manager logs that a reorder has been placed.
    Body: { product_id, quantity_ordered, expected_days (default 7), notes }
    Creates a reorder_log entry and inserts into activity feed.
    """
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    body             = request.get_json(silent=True) or {}
    product_id       = int(body.get('product_id', 0))
    quantity_ordered = int(body.get('quantity_ordered', 0))
    expected_days    = max(1, min(180, int(body.get('expected_days', 7))))
    notes            = str(body.get('notes', '') or '').strip()[:500]

    if not product_id or quantity_ordered <= 0:
        return jsonify({'message': 'product_id and quantity_ordered (>0) are required'}), 400

    conn = get_db()
    c    = conn.cursor()
    c.execute(
        "SELECT product_name FROM products WHERE product_id = ? AND company_id = ?",
        (product_id, company_id),
    )
    product = c.fetchone()
    if not product:
        conn.close()
        return jsonify({'message': 'Product not found'}), 404

    c.execute("""
        SELECT log_id, quantity_ordered,
               DATE(ordered_at, '+' || expected_days || ' days') AS expected_arrival
        FROM reorder_log
        WHERE company_id = ? AND product_id = ? AND status = 'pending'
        ORDER BY log_id DESC
        LIMIT 1
    """, (company_id, product_id))
    pending = c.fetchone()
    if pending:
        conn.close()
        return jsonify({
            'message': (
                f'A pending reorder already exists for {product["product_name"]}: '
                f'{pending["quantity_ordered"]} units expected {pending["expected_arrival"] or "soon"}. '
                'Confirm delivery before logging another order.'
            ),
            'pending_log_id': pending['log_id'],
        }), 409

    c.execute("""
        INSERT INTO reorder_log
            (company_id, product_id, quantity_ordered, expected_days,
             ordered_by, notes, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
    """, (company_id, product_id, quantity_ordered, expected_days,
          session.get('username', 'unknown'), notes))
    log_id = c.lastrowid
    conn.commit()
    conn.close()

    return jsonify({
        'log_id':         log_id,
        'product_name':   product['product_name'],
        'quantity':       quantity_ordered,
        'expected_days':  expected_days,
        'message':        f'Reorder of {quantity_ordered} units logged for {product["product_name"]}.',
    })


@api.route('/reorder/pending')
def get_pending_reorders():
    """Return all pending reorder log entries for this company."""
    err = login_required()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    c.execute("""
        SELECT rl.log_id, rl.product_id, p.product_name,
               rl.quantity_ordered, rl.expected_days, rl.ordered_by,
               rl.notes, rl.status, rl.ordered_at,
               DATE(rl.ordered_at, '+' || rl.expected_days || ' days') AS expected_arrival
        FROM reorder_log rl
        JOIN products p ON rl.product_id = p.product_id
        WHERE rl.company_id = ? AND rl.status = 'pending'
        ORDER BY rl.ordered_at DESC
    """, (company_id,))
    rows = [row_to_dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)


@api.route('/reorder/update', methods=['POST'])
def update_pending_reorder():
    """
    Manager updates a pending reorder before delivery.
    Body: { log_id, quantity_ordered, expected_days, notes }
    Delivered reorder logs are immutable because they already affected stock.
    """
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    body = request.get_json(silent=True) or {}
    try:
        log_id = int(body.get('log_id', 0))
        quantity_ordered = int(body.get('quantity_ordered', 0))
        expected_days = max(1, min(180, int(body.get('expected_days', 7))))
    except (TypeError, ValueError):
        return jsonify({'message': 'log_id, quantity_ordered, and expected_days must be numeric'}), 400
    notes = str(body.get('notes', '') or '').strip()[:500]

    if not log_id or quantity_ordered <= 0:
        return jsonify({'message': 'log_id and quantity_ordered (>0) are required'}), 400

    conn = get_db()
    c = conn.cursor()
    c.execute("""
        SELECT rl.log_id, p.product_name
        FROM reorder_log rl
        JOIN products p ON p.product_id = rl.product_id
        WHERE rl.log_id = ? AND rl.company_id = ? AND rl.status = 'pending'
    """, (log_id, company_id))
    entry = c.fetchone()
    if not entry:
        conn.close()
        return jsonify({'message': 'Pending reorder log entry not found'}), 404

    c.execute("""
        UPDATE reorder_log
        SET quantity_ordered = ?, expected_days = ?, notes = ?
        WHERE log_id = ? AND company_id = ? AND status = 'pending'
    """, (quantity_ordered, expected_days, notes, log_id, company_id))
    conn.commit()
    conn.close()

    return jsonify({
        'message': f'Pending reorder updated for {entry["product_name"]}.',
        'log_id': log_id,
        'quantity_ordered': quantity_ordered,
        'expected_days': expected_days,
    })


@api.route('/reorder/confirm', methods=['POST'])
def confirm_reorder_delivery():
    """
    Manager confirms delivery — updates stock_on_hand and marks log entry as delivered.
    Body: { log_id, actual_quantity (optional, defaults to quantity_ordered) }
    """
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    body            = request.get_json(silent=True) or {}
    log_id          = int(body.get('log_id', 0))
    actual_quantity = body.get('actual_quantity')

    if not log_id:
        return jsonify({'message': 'log_id is required'}), 400

    conn = get_db()
    c    = conn.cursor()
    c.execute(
        "SELECT * FROM reorder_log WHERE log_id = ? AND company_id = ? AND status = 'pending'",
        (log_id, company_id),
    )
    entry = c.fetchone()
    if not entry:
        conn.close()
        return jsonify({'message': 'Pending reorder log entry not found'}), 404

    qty = int(actual_quantity) if actual_quantity is not None else entry['quantity_ordered']
    if qty <= 0:
        conn.close()
        return jsonify({'message': 'actual_quantity must be positive'}), 400

    # Update stock
    c.execute("""
        UPDATE inventory
        SET stock_on_hand = stock_on_hand + ?,
            last_updated  = DATE('now')
        WHERE company_id = ? AND product_id = ?
    """, (qty, company_id, entry['product_id']))

    # Mark delivered
    c.execute("""
        UPDATE reorder_log
        SET status = 'delivered', actual_quantity = ?, delivered_at = DATETIME('now')
        WHERE log_id = ?
    """, (qty, log_id))

    conn.commit()

    # Refresh forecast/decisions for this product
    product_id = entry['product_id']
    c.execute(
        "SELECT is_active FROM products WHERE product_id = ? AND company_id = ?",
        (product_id, company_id),
    )
    prod = c.fetchone()
    conn.close()

    if prod:
        from services.forecast_service   import run_forecast_for_product
        from services.decision_service   import compute_decision_for_product
        from services.evaluation_service import run_evaluation_for_product
        conn2 = get_db()
        c2 = conn2.cursor()
        c2.execute("DELETE FROM forecast  WHERE company_id=? AND product_id=?", (company_id, product_id))
        c2.execute("DELETE FROM decisions WHERE company_id=? AND product_id=?", (company_id, product_id))
        c2.execute("DELETE FROM evaluation WHERE company_id=? AND product_id=?", (company_id, product_id))
        conn2.commit()
        conn2.close()
        run_forecast_for_product(product_id, prod['is_active'])
        compute_decision_for_product(product_id)
        if prod['is_active']:
            run_evaluation_for_product(product_id)

    return jsonify({
        'message':         f'Delivery confirmed — {qty} units added to stock.',
        'product_id':      product_id,
        'quantity_added':  qty,
    })

```

### src/core/routes/auth.py
```python
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

```

### src/core/routes/manual.py
```python
"""
Manual Data Entry routes for StockLens.

Manager-only. Allows creating products and recording sales without CSV uploads.
Data is stored in the same products/sales tables and triggers the same pipeline,
ensuring manual entries are indistinguishable from uploaded data in forecasting.

Endpoints:
  POST /api/manual/product              — create a new product
  POST /api/manual/sales                — record / update a single sales entry
  GET  /api/manual/sales/<product_id>   — full time-series for a product
  GET  /api/manual/products             — list all manually-created products
  POST /api/manual/pipeline/<product_id>— run forecast + decision + eval for one product
"""

import logging
import re
from datetime import date, timedelta

from flask import Blueprint, jsonify, request, session

from auth_utils import api_login_required, api_manager_only, require_company
from database import get_db

log = logging.getLogger(__name__)

manual_bp = Blueprint('manual', __name__)


# ── auth helpers (mirrors api.py style) ────────────────────────────────────────

def _login_required():
    return api_login_required()


def _manager_only():
    return api_manager_only()


def _require_company():
    return require_company()


# ── internal helpers ───────────────────────────────────────────────────────────

def _fill_date_gaps(conn, company_id: int, product_id: int) -> int:
    """
    Ensure a contiguous daily record from min_date to max_date exists for this product.
    Missing days are inserted with units_sold = 0 and data_source = 'manual'.
    Returns the number of zero-fill days inserted.
    """
    c = conn.cursor()
    c.execute(
        "SELECT MIN(date) AS min_d, MAX(date) AS max_d "
        "FROM sales WHERE company_id = ? AND product_id = ?",
        (company_id, product_id),
    )
    row = c.fetchone()
    if not row or not row['min_d']:
        return 0

    min_d = date.fromisoformat(row['min_d'])
    max_d = date.fromisoformat(row['max_d'])

    c.execute(
        "SELECT date FROM sales WHERE company_id = ? AND product_id = ?",
        (company_id, product_id),
    )
    existing_dates = {r['date'] for r in c.fetchall()}

    filled = 0
    current = min_d
    while current <= max_d:
        ds = current.isoformat()
        if ds not in existing_dates:
            c.execute(
                "INSERT INTO sales (company_id, product_id, date, units_sold, data_source) "
                "VALUES (?, ?, ?, 0, 'manual')",
                (company_id, product_id, ds),
            )
            filled += 1
        current += timedelta(days=1)

    return filled


def _count_sales_days(conn, company_id: int, product_id: int) -> int:
    c = conn.cursor()
    c.execute(
        "SELECT COUNT(*) AS cnt FROM sales WHERE company_id = ? AND product_id = ?",
        (company_id, product_id),
    )
    return c.fetchone()['cnt']


_CATEGORY_RULES = (
    ('Beverages', ('fanta', 'cola', 'coke', 'pepsi', 'sprite', '7up', 'juice', 'water', 'drink', 'soda', 'lemonade', 'tonic', 'smoothie')),
    ('Hot Drinks', ('coffee', 'tea', 'tea bags', 'pg tips', 'espresso', 'latte', 'cappuccino', 'hot chocolate', 'cocoa')),
    ('Dairy', ('milk', 'cheese', 'yoghurt', 'yogurt', 'butter', 'cream')),
    ('Bakery', ('bread', 'bun', 'roll', 'bagel', 'croissant', 'cake', 'muffin', 'pastry')),
    ('Snacks', ('crisps', 'chips', 'chocolate', 'bar', 'biscuit', 'cookie', 'sweets', 'candy', 'nuts', 'popcorn')),
    ('Health & Beauty', ('shampoo', 'soap', 'toothpaste', 'deodorant', 'cream', 'lotion', 'sun cream', 'spf')),
    ('Health', ('paracetamol', 'ibuprofen', 'medicine', 'vitamin', 'plaster', 'tablet', 'tabs')),
    ('Stationery', ('pen', 'pencil', 'notebook', 'paper', 'card', 'envelope')),
    ('Seasonal', ('mince pie', 'christmas', 'easter', 'halloween', 'valentine')),
)


def _infer_category(product_name: str) -> str:
    normalized = f" {re.sub(r'[^a-z0-9]+', ' ', (product_name or '').lower())} "
    for category, keywords in _CATEGORY_RULES:
        if any(f" {re.sub(r'[^a-z0-9]+', ' ', keyword.lower())} " in normalized for keyword in keywords):
            return category
    return 'General'


def _parse_optional_money(value, field_name: str):
    if value is None or value == '':
        return None, None
    try:
        parsed = float(value)
        if parsed < 0:
            raise ValueError
        return parsed, None
    except (ValueError, TypeError):
        return None, (jsonify({'message': f'{field_name} must be a non-negative number'}), 400)


# ── POST /api/manual/product ───────────────────────────────────────────────────

@manual_bp.route('/manual/product', methods=['POST'])
def create_manual_product():
    """Create a new product via manual entry mode."""
    err = _manager_only()
    if err:
        return err
    company_id, company_err = _require_company()
    if company_err:
        return company_err

    body     = request.get_json(silent=True) or {}
    name     = (body.get('name') or '').strip()
    category = (body.get('category') or '').strip()
    stock    = body.get('current_stock', 0)
    purchase_cost = body.get('purchase_cost')
    price = body.get('selling_price', body.get('price'))

    if not name:
        return jsonify({'message': 'Product name is required'}), 400

    if not category:
        category = _infer_category(name)

    try:
        stock = int(stock)
        if stock < 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({'message': 'current_stock must be a non-negative integer'}), 400

    purchase_cost, purchase_cost_err = _parse_optional_money(purchase_cost, 'purchase_cost')
    if purchase_cost_err:
        return purchase_cost_err

    price, price_err = _parse_optional_money(price, 'selling_price')
    if price_err:
        return price_err

    conn = get_db()
    c    = conn.cursor()

    # Prevent duplicate names within the same company
    c.execute(
        "SELECT product_id FROM products WHERE company_id = ? AND LOWER(product_name) = LOWER(?)",
        (company_id, name),
    )
    if c.fetchone():
        conn.close()
        return jsonify({'message': f'A product named "{name}" already exists'}), 409

    # Auto-generate a manual SKU
    c.execute("SELECT COUNT(*) AS cnt FROM products WHERE company_id = ?", (company_id,))
    count = c.fetchone()['cnt']
    sku = f"MAN-{count + 1:04d}"

    c.execute(
        "INSERT INTO products "
        "(company_id, product_name, sku, category, purchase_cost, price, is_active, data_source) "
        "VALUES (?, ?, ?, ?, ?, ?, 1, 'manual')",
        (company_id, name, sku, category, purchase_cost, price),
    )
    product_id = c.lastrowid

    # Seed an inventory row so the product appears in the inventory tab immediately
    c.execute(
        "INSERT INTO inventory (company_id, product_id, stock_on_hand, last_updated) "
        "VALUES (?, ?, ?, DATE('now'))",
        (company_id, product_id, stock),
    )

    conn.commit()
    conn.close()

    log.info(
        "Manual product created: %s (id=%d, sku=%s, company=%d)",
        name, product_id, sku, company_id,
    )

    return jsonify({
        'message':      f'Product "{name}" created successfully',
        'product_id':   product_id,
        'product_name': name,
        'sku':          sku,
        'category':     category,
        'purchase_cost': purchase_cost,
        'selling_price': price,
    }), 201


# ── POST /api/manual/sales ─────────────────────────────────────────────────────

@manual_bp.route('/manual/sales', methods=['POST'])
def add_manual_sales():
    """
    Record (or update) a single daily sales entry for a product.
    If the date already exists the units_sold value is overwritten.
    Date gaps between the earliest and latest entry are filled with zeros.
    """
    err = _manager_only()
    if err:
        return err
    company_id, company_err = _require_company()
    if company_err:
        return company_err

    body       = request.get_json(silent=True) or {}
    product_id = body.get('product_id')
    date_str   = (body.get('date') or '').strip()
    units_sold = body.get('units_sold')

    # --- validate product_id ---
    if product_id is None:
        return jsonify({'message': 'product_id is required'}), 400
    try:
        product_id = int(product_id)
    except (ValueError, TypeError):
        return jsonify({'message': 'product_id must be an integer'}), 400

    # --- validate date ---
    if not date_str:
        return jsonify({'message': 'date is required (YYYY-MM-DD)'}), 400
    try:
        entry_date = date.fromisoformat(date_str)
    except ValueError:
        return jsonify({'message': 'date must be in YYYY-MM-DD format'}), 400
    if entry_date > date.today():
        return jsonify({'message': 'date cannot be in the future'}), 400

    # --- validate units_sold ---
    if units_sold is None:
        return jsonify({'message': 'units_sold is required'}), 400
    try:
        units_sold = int(units_sold)
        if units_sold < 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({'message': 'units_sold must be a non-negative integer'}), 400

    conn = get_db()
    c    = conn.cursor()

    # Verify the product belongs to this company
    c.execute(
        "SELECT product_id, product_name FROM products "
        "WHERE product_id = ? AND company_id = ?",
        (product_id, company_id),
    )
    product = c.fetchone()
    if not product:
        conn.close()
        return jsonify({'message': 'Product not found'}), 404

    # Upsert: update if the date exists, insert otherwise
    c.execute(
        "SELECT sale_id FROM sales "
        "WHERE company_id = ? AND product_id = ? AND date = ?",
        (company_id, product_id, date_str),
    )
    existing = c.fetchone()

    if existing:
        c.execute(
            "UPDATE sales SET units_sold = ?, data_source = 'manual' WHERE sale_id = ?",
            (units_sold, existing['sale_id']),
        )
        action = 'updated'
    else:
        c.execute(
            "INSERT INTO sales (company_id, product_id, date, units_sold, data_source) "
            "VALUES (?, ?, ?, ?, 'manual')",
            (company_id, product_id, date_str, units_sold),
        )
        action = 'inserted'

    filled     = _fill_date_gaps(conn, company_id, product_id)
    total_days = _count_sales_days(conn, company_id, product_id)
    conn.commit()
    conn.close()

    log.info(
        "Manual sales %s: product_id=%d date=%s units=%d gaps_filled=%d total_days=%d (company=%d)",
        action, product_id, date_str, units_sold, filled, total_days, company_id,
    )

    return jsonify({
        'message':        f'Sales entry {action}',
        'product_id':     product_id,
        'product_name':   product['product_name'],
        'date':           date_str,
        'units_sold':     units_sold,
        'action':         action,
        'filled_gaps':    filled,
        'total_days':     total_days,
        'pipeline_ready': total_days >= 30,
    }), 200


# ── GET /api/manual/sales/<product_id> ────────────────────────────────────────

@manual_bp.route('/manual/sales/<int:product_id>', methods=['GET'])
def get_manual_timeline(product_id):
    """Return the complete daily time-series for a manually-entered product."""
    err = _manager_only()
    if err:
        return err
    company_id, company_err = _require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()

    c.execute(
        "SELECT product_id, product_name FROM products "
        "WHERE product_id = ? AND company_id = ?",
        (product_id, company_id),
    )
    product = c.fetchone()
    if not product:
        conn.close()
        return jsonify({'message': 'Product not found'}), 404

    c.execute(
        "SELECT date, units_sold, data_source "
        "FROM sales "
        "WHERE company_id = ? AND product_id = ? "
        "ORDER BY date DESC",
        (company_id, product_id),
    )
    rows       = [dict(r) for r in c.fetchall()]
    total_days = len(rows)
    # Zero-fill rows that were auto-inserted for gap continuity
    filled_count = sum(
        1 for r in rows
        if r['units_sold'] == 0 and r.get('data_source') == 'manual'
    )
    conn.close()

    return jsonify({
        'product_id':     product_id,
        'product_name':   product['product_name'],
        'total_days':     total_days,
        'filled_days':    filled_count,
        'pipeline_ready': total_days >= 30,
        'rows':           rows,
    })


# ── GET /api/manual/products ───────────────────────────────────────────────────

@manual_bp.route('/manual/products', methods=['GET'])
def get_manual_products():
    """List all manually-created products with their sales summary and decision."""
    err = _manager_only()
    if err:
        return err
    company_id, company_err = _require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    c.execute(
        """
        SELECT
            p.product_id,
            p.product_name,
            p.category,
            p.purchase_cost,
            p.price,
            p.sku,
            COALESCE(i.stock_on_hand, 0)     AS stock_on_hand,
            COUNT(s.sale_id)                  AS total_days,
            COALESCE(SUM(s.units_sold), 0)    AS total_units,
            MAX(s.date)                        AS last_entry,
            d.action                           AS decision
        FROM products p
        LEFT JOIN inventory i
            ON i.product_id = p.product_id AND i.company_id = p.company_id
        LEFT JOIN sales s
            ON s.product_id = p.product_id AND s.company_id = p.company_id
        LEFT JOIN (
            SELECT product_id, action
            FROM decisions
            WHERE company_id = ?
              AND decision_id IN (
                SELECT MAX(decision_id) FROM decisions
                WHERE company_id = ?
                GROUP BY product_id
              )
        ) d ON p.product_id = d.product_id
        WHERE p.company_id = ? AND p.data_source = 'manual'
        GROUP BY p.product_id
        ORDER BY p.product_name
        """,
        (company_id, company_id, company_id),
    )
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)


# ── POST /api/manual/pipeline/<product_id> ────────────────────────────────────

@manual_bp.route('/manual/pipeline/<int:product_id>', methods=['POST'])
def run_manual_pipeline(product_id):
    """
    Trigger forecast → decision → evaluation for a single manually-entered product.
    Requires >= 30 days of sales data.  Evaluation is only attempted with >= 90 days.
    """
    err = _manager_only()
    if err:
        return err
    company_id, company_err = _require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()

    c.execute(
        "SELECT product_name FROM products WHERE product_id = ? AND company_id = ?",
        (product_id, company_id),
    )
    product = c.fetchone()
    if not product:
        conn.close()
        return jsonify({'message': 'Product not found'}), 404

    total_days = _count_sales_days(conn, company_id, product_id)
    conn.close()

    if total_days < 30:
        return jsonify({
            'message':        (
                f'Insufficient data — need at least 30 days of sales. '
                f'You have {total_days} so far. '
                f'Add {30 - total_days} more day(s) to unlock forecasting.'
            ),
            'total_days':     total_days,
            'pipeline_ready': False,
        }), 400

    from services.forecast_service import run_forecast_for_product
    from services.decision_service import compute_decision_for_product
    from services.evaluation_service import run_evaluation_for_product

    try:
        run_forecast_for_product(product_id, is_active=1)
        compute_decision_for_product(product_id)
        evaluated = total_days >= 90
        if evaluated:
            run_evaluation_for_product(product_id)

        log.info(
            "Manual pipeline complete: product_id=%d evaluated=%s (company=%d)",
            product_id, evaluated, company_id,
        )
        return jsonify({
            'message':        f'Pipeline complete for "{product["product_name"]}"',
            'product_id':     product_id,
            'evaluated':      evaluated,
            'pipeline_ready': True,
        })

    except Exception as exc:
        log.exception(
            "Manual pipeline error: product_id=%d company=%d — %s",
            product_id, company_id, exc,
        )
        return jsonify({'message': 'Pipeline failed — check server logs'}), 500

```

### src/core/routes/onboarding.py
```python
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

```

### src/core/routes/pages.py
```python
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

```

## Question 7 — Existing tests

Found: `src/setup/test_load.py`, `tests/test_readiness.py`

### src/setup/test_load.py
```python
import pandas as pd

# Load CSV
df = pd.read_csv("data/sales.csv")

# Show first rows
print(df.head())
```

### tests/test_readiness.py
```python
import os
import subprocess
import sys


def test_public_recovery_and_legal_pages_load():
    from src.core.app import create_app

    app = create_app()
    client = app.test_client()

    for path in [
        "/forgot-password",
        "/reset-password/test-token",
        "/verify-email/test-token",
        "/privacy",
        "/terms",
        "/contact",
    ]:
        response = client.get(path)
        assert response.status_code == 200


def test_production_requires_secret_key():
    env = os.environ.copy()
    env.pop("SECRET_KEY", None)
    env["APP_ENV"] = "production"
    env["FLASK_ENV"] = "production"

    result = subprocess.run(
        [sys.executable, "-c", "import src.core.config"],
        cwd=os.getcwd(),
        env=env,
        capture_output=True,
        text=True,
    )

    assert result.returncode != 0
    assert "SECRET_KEY must be set in production" in result.stderr


def test_authenticated_mutations_require_csrf():
    from src.core.app import create_app

    app = create_app()
    client = app.test_client()

    login = client.post(
        "/api/login",
        json={"email": "manager1@stocklens.local", "password": "pass123"},
    )
    assert login.status_code == 200
    client.get("/dashboard")
    with client.session_transaction() as session:
        token = session["csrf_token"]

    blocked = client.post("/api/company/settings", json={"currency_symbol": "£"})
    assert blocked.status_code == 403

    allowed = client.post(
        "/api/company/settings",
        json={"currency_symbol": "£"},
        headers={"X-CSRF-Token": token},
    )
    assert allowed.status_code == 200

```

## Question 8 — Configuration

Found: `.env.example`, `src/core/config.py`

### .env.example
```bash
APP_ENV=production
FLASK_ENV=production
SECRET_KEY=replace-with-64-hex-chars-from-python-secrets-token-hex-32
SESSION_COOKIE_SECURE=1
SESSION_COOKIE_SAMESITE=Lax
PORT=5001
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM=no-reply@stocklens.local
SMTP_USE_TLS=1
ENABLE_SCHEDULER=0
SCHEDULER_INTERVAL_SECONDS=86400

```

### src/core/config.py
```python
import os
from datetime import timedelta

# Absolute project root (two levels up from src/core/)
ROOT     = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH  = os.path.join(ROOT, 'db', 'stocklens.db')
DATA_DIR = os.path.join(ROOT, 'data')
DB_DIR   = os.path.join(ROOT, 'db')

ENV = os.getenv('FLASK_ENV', os.getenv('APP_ENV', 'development')).lower()
IS_PRODUCTION = ENV in {'production', 'prod'}

SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    if IS_PRODUCTION:
        raise RuntimeError('SECRET_KEY must be set in production. Generate one with: python -c "import secrets; print(secrets.token_hex(32))"')
    SECRET_KEY = 'dev-only-change-me'
elif IS_PRODUCTION and SECRET_KEY == 'dev-only-change-me':
    raise RuntimeError('SECRET_KEY is still the development default. Set a unique 32-byte secret before deploying.')
SESSION_LIFETIME = timedelta(hours=12)
SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', '1' if IS_PRODUCTION else '0') == '1'
SESSION_COOKIE_SAMESITE = os.getenv('SESSION_COOKIE_SAMESITE', 'Lax')
SESSION_COOKIE_HTTPONLY = True

```
