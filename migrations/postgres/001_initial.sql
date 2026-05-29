CREATE TABLE IF NOT EXISTS companies (
    company_id SERIAL PRIMARY KEY,
    company_name TEXT NOT NULL,
    industry TEXT,
    description TEXT,
    currency_symbol TEXT DEFAULT '£',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id),
    email TEXT,
    username TEXT NOT NULL,
    password TEXT DEFAULT '',
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'staff',
    is_active INTEGER NOT NULL DEFAULT 1,
    email_verified INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invite_codes (
    code TEXT PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    created_by INTEGER NOT NULL REFERENCES users(user_id),
    used INTEGER NOT NULL DEFAULT 0,
    use_count INTEGER NOT NULL DEFAULT 0,
    max_uses INTEGER NOT NULL DEFAULT 1,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    product_id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id),
    product_name TEXT NOT NULL,
    category TEXT,
    price REAL,
    purchase_cost REAL,
    sku TEXT,
    is_active INTEGER DEFAULT 1,
    is_seasonal INTEGER DEFAULT 0,
    season TEXT,
    data_source TEXT DEFAULT 'upload'
);

CREATE TABLE IF NOT EXISTS sales (
    sale_id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id),
    product_id INTEGER NOT NULL REFERENCES products(product_id),
    date DATE NOT NULL,
    units_sold INTEGER NOT NULL,
    data_source TEXT DEFAULT 'upload'
);

CREATE TABLE IF NOT EXISTS inventory (
    inventory_id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id),
    product_id INTEGER NOT NULL REFERENCES products(product_id),
    stock_on_hand INTEGER NOT NULL DEFAULT 0,
    last_updated DATE
);

CREATE TABLE IF NOT EXISTS forecast (
    rec_id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id),
    product_id INTEGER NOT NULL REFERENCES products(product_id),
    forecast_demand REAL,
    safety_stock REAL,
    reorder_point REAL,
    order_quantity REAL,
    model_used TEXT DEFAULT 'SMA',
    lower_bound REAL DEFAULT 0,
    upper_bound REAL DEFAULT 0,
    stockout_prob REAL DEFAULT 0,
    trend_slope REAL DEFAULT 0,
    trend_direction TEXT DEFAULT 'STABLE',
    risk_flag TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS decisions (
    decision_id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id),
    product_id INTEGER NOT NULL REFERENCES products(product_id),
    action TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evaluation (
    eval_id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id),
    product_id INTEGER NOT NULL REFERENCES products(product_id),
    mae REAL,
    mape REAL,
    rmse REAL,
    bias REAL,
    mase REAL,
    tracking_signal REAL,
    naive_mae REAL,
    naive_mase REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reorder_log (
    log_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    product_id INTEGER NOT NULL REFERENCES products(product_id),
    quantity_ordered INTEGER NOT NULL,
    actual_quantity INTEGER,
    expected_days INTEGER NOT NULL DEFAULT 7,
    ordered_by TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS upload_log (
    log_id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id),
    filename TEXT NOT NULL,
    uploaded_by TEXT,
    rows_inserted INTEGER DEFAULT 0,
    new_products INTEGER DEFAULT 0,
    skipped_duplicates INTEGER DEFAULT 0,
    inventory_updates INTEGER DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_classification (
    class_id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id),
    product_id INTEGER UNIQUE NOT NULL REFERENCES products(product_id),
    abc_class TEXT,
    xyz_class TEXT,
    combined_class TEXT,
    revenue_contribution REAL,
    cv REAL,
    review_frequency TEXT,
    strategy TEXT,
    classified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rate_limits (
    rate_limit_id SERIAL PRIMARY KEY,
    bucket_key TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scenario_results (
    scenario_id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    product_id INTEGER,
    product_name TEXT,
    result_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pipeline_jobs (
    job_id TEXT PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    status TEXT NOT NULL DEFAULT 'queued',
    message TEXT,
    products_processed INTEGER DEFAULT 0,
    error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    finished_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_company ON sales(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_company ON inventory(company_id);
CREATE INDEX IF NOT EXISTS idx_forecast_company ON forecast(company_id);
CREATE INDEX IF NOT EXISTS idx_decisions_company ON decisions(company_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_bucket ON rate_limits(bucket_key, created_at);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_company ON pipeline_jobs(company_id, created_at);
