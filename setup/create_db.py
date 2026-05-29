import os
import sqlite3

from werkzeug.security import generate_password_hash

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT, 'db', 'stocklens.db')


def create_schema():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.executescript(
        """
        DROP TABLE IF EXISTS invite_codes;
        DROP TABLE IF EXISTS product_classification;
        DROP TABLE IF EXISTS upload_log;
        DROP TABLE IF EXISTS evaluation;
        DROP TABLE IF EXISTS decisions;
        DROP TABLE IF EXISTS forecast;
        DROP TABLE IF EXISTS inventory;
        DROP TABLE IF EXISTS sales;
        DROP TABLE IF EXISTS products;
        DROP TABLE IF EXISTS users;
        DROP TABLE IF EXISTS companies;

        CREATE TABLE companies (
            company_id    INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name  TEXT NOT NULL,
            industry      TEXT,
            description   TEXT,
            created_at    TEXT DEFAULT (DATE('now'))
        );

        CREATE TABLE users (
            user_id        INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id     INTEGER,
            email          TEXT UNIQUE NOT NULL,
            username       TEXT NOT NULL,
            password_hash  TEXT NOT NULL,
            role           TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('manager', 'staff')),
            is_active      INTEGER NOT NULL DEFAULT 1,
            created_at     TEXT DEFAULT (DATETIME('now')),
            FOREIGN KEY (company_id) REFERENCES companies(company_id)
        );

        CREATE TABLE invite_codes (
            code          TEXT PRIMARY KEY,
            company_id    INTEGER NOT NULL,
            created_by    INTEGER NOT NULL,
            used          INTEGER NOT NULL DEFAULT 0,
            expires_at    TEXT,
            created_at    TEXT DEFAULT (DATETIME('now')),
            FOREIGN KEY (company_id) REFERENCES companies(company_id),
            FOREIGN KEY (created_by) REFERENCES users(user_id)
        );

        CREATE TABLE products (
            product_id    INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id    INTEGER NOT NULL,
            product_name  TEXT NOT NULL,
            sku           TEXT,
            category      TEXT,
            purchase_cost REAL,
            price         REAL,
            is_active     INTEGER NOT NULL DEFAULT 1,
            is_seasonal   INTEGER NOT NULL DEFAULT 0,
            season        TEXT,
            created_at    TEXT DEFAULT (DATE('now')),
            FOREIGN KEY (company_id) REFERENCES companies(company_id)
        );

        CREATE TABLE sales (
            sale_id      INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id   INTEGER NOT NULL,
            product_id   INTEGER NOT NULL,
            date         TEXT NOT NULL,
            units_sold   INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (company_id) REFERENCES companies(company_id),
            FOREIGN KEY (product_id) REFERENCES products(product_id)
        );

        CREATE TABLE inventory (
            inventory_id   INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id     INTEGER NOT NULL,
            product_id     INTEGER UNIQUE NOT NULL,
            stock_on_hand  INTEGER NOT NULL DEFAULT 0,
            last_updated   TEXT,
            FOREIGN KEY (company_id) REFERENCES companies(company_id),
            FOREIGN KEY (product_id) REFERENCES products(product_id)
        );

        CREATE TABLE forecast (
            rec_id            INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id        INTEGER NOT NULL,
            product_id        INTEGER NOT NULL,
            forecast_demand   REAL,
            safety_stock      REAL,
            reorder_point     REAL,
            order_quantity    REAL,
            risk_flag         TEXT,
            model_used        TEXT DEFAULT 'SMA',
            lower_bound       REAL DEFAULT 0,
            upper_bound       REAL DEFAULT 0,
            stockout_prob     REAL DEFAULT 0,
            trend_slope       REAL DEFAULT 0,
            trend_direction   TEXT DEFAULT 'STABLE',
            created_at        TEXT DEFAULT (DATETIME('now')),
            FOREIGN KEY (company_id) REFERENCES companies(company_id),
            FOREIGN KEY (product_id) REFERENCES products(product_id)
        );

        CREATE TABLE decisions (
            decision_id   INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id    INTEGER NOT NULL,
            product_id    INTEGER NOT NULL,
            action        TEXT NOT NULL,
            reason        TEXT,
            created_at    TEXT DEFAULT (DATETIME('now')),
            FOREIGN KEY (company_id) REFERENCES companies(company_id),
            FOREIGN KEY (product_id) REFERENCES products(product_id)
        );

        CREATE TABLE evaluation (
            eval_id            INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id         INTEGER NOT NULL,
            product_id         INTEGER NOT NULL,
            mae                REAL,
            rmse               REAL,
            bias               REAL,
            mase               REAL,
            tracking_signal    REAL,
            predicted_demand   REAL,
            actual_demand      REAL,
            accuracy_pct       REAL,
            eval_period        TEXT,
            created_at         TEXT DEFAULT (DATETIME('now')),
            FOREIGN KEY (company_id) REFERENCES companies(company_id),
            FOREIGN KEY (product_id) REFERENCES products(product_id)
        );

        CREATE TABLE upload_log (
            log_id               INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id           INTEGER NOT NULL,
            filename             TEXT NOT NULL,
            uploaded_by          TEXT,
            rows_inserted        INTEGER DEFAULT 0,
            new_products         INTEGER DEFAULT 0,
            skipped_duplicates   INTEGER DEFAULT 0,
            inventory_updates    INTEGER DEFAULT 0,
            uploaded_at          TEXT DEFAULT (DATETIME('now')),
            FOREIGN KEY (company_id) REFERENCES companies(company_id)
        );

        CREATE TABLE product_classification (
            class_id              INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id            INTEGER NOT NULL,
            product_id            INTEGER UNIQUE NOT NULL,
            abc_class             TEXT,
            xyz_class             TEXT,
            combined_class        TEXT,
            revenue_contribution  REAL,
            cv                    REAL,
            review_frequency      TEXT,
            strategy              TEXT,
            classified_at         TEXT DEFAULT (DATETIME('now')),
            FOREIGN KEY (company_id) REFERENCES companies(company_id),
            FOREIGN KEY (product_id) REFERENCES products(product_id)
        );

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
        CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
        CREATE INDEX IF NOT EXISTS idx_sales_company ON sales(company_id);
        CREATE INDEX IF NOT EXISTS idx_inventory_company ON inventory(company_id);
        CREATE INDEX IF NOT EXISTS idx_forecast_company ON forecast(company_id);
        CREATE INDEX IF NOT EXISTS idx_decisions_company ON decisions(company_id);
        CREATE INDEX IF NOT EXISTS idx_evaluation_company ON evaluation(company_id);
        CREATE INDEX IF NOT EXISTS idx_upload_log_company ON upload_log(company_id);
        CREATE INDEX IF NOT EXISTS idx_classification_company ON product_classification(company_id);
        CREATE INDEX IF NOT EXISTS idx_invite_codes_company ON invite_codes(company_id);
        """
    )

    c.execute(
        "INSERT INTO companies (company_name, industry, description) VALUES (?, ?, ?)",
        ('DEFAULT_COMPANY', 'General Retail', 'Initial seeded company'),
    )
    company_id = c.lastrowid

    c.execute(
        """
        INSERT INTO users (company_id, email, username, password_hash, role, is_active)
        VALUES (?, ?, ?, ?, 'manager', 1)
        """,
        (company_id, 'manager1@stocklens.local', 'manager1', generate_password_hash('pass123')),
    )

    conn.commit()
    conn.close()
    print(f'Schema created at {DB_PATH}')


if __name__ == '__main__':
    create_schema()
