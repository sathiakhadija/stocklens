#!/usr/bin/env bash
set -e

pip install -r requirements.txt

echo "==> Setting up database..."
python setup/create_db.py || true
python setup/generate_data.py || true
python setup/run_forecasts.py || true
echo "==> Database ready."
