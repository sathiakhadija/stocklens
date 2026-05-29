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
