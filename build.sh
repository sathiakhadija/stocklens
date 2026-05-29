#!/usr/bin/env bash
set -e

PYTHON_BIN="$(command -v python || command -v python3)"

"$PYTHON_BIN" -m pip install -r requirements.txt

echo "==> Setting up database..."
"$PYTHON_BIN" setup/create_db.py
"$PYTHON_BIN" setup/generate_data.py
"$PYTHON_BIN" setup/run_forecasts.py
"$PYTHON_BIN" -c "import sqlite3; conn = sqlite3.connect('db/stocklens.db'); tables = {row[0] for row in conn.execute(\"SELECT name FROM sqlite_master WHERE type='table'\")}; missing = {'users', 'products', 'sales', 'inventory', 'forecast', 'decisions'} - tables; assert not missing, f'Missing database tables: {sorted(missing)}'; print('==> Verified database schema.')"
echo "==> Database ready."
