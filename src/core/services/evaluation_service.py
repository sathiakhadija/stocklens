"""
Forecast evaluation — multi-metric using train/test split.

Windows:
  Training:   days -90 to -31  (60 days)
  Test:       days -30 to -1   (30 days)
  Prediction: best model's forecast on training window (same as production)

Metrics:
  MAE             — Mean Absolute Error
  RMSE            — Root Mean Squared Error (penalises large errors more)
  Bias            — Mean signed error (positive = over-forecast, negative = under)
  MAPE / Accuracy — Mean Absolute Percentage Error → Accuracy % = max(0, 100 - MAPE)
  MASE            — Mean Absolute Scaled Error vs naïve baseline (lower = better than naïve)
  Tracking Signal — Cumulative error / MAD; |TS| > 4 signals systematic drift
"""
import math
from database import get_db


def _naive_mae(series):
    """MAE of a naïve one-step-ahead forecast (previous value)."""
    if len(series) < 2:
        return 1.0
    errors = [abs(series[i] - series[i - 1]) for i in range(1, len(series))]
    return sum(errors) / len(errors) or 1.0


def _naive_mae_test(train_vals, test_vals):
    """MAE of persistence model on the test window (y_hat[t] = y[t-1]).
    First test prediction uses the last training value as the prior observation."""
    if not test_vals:
        return 1.0
    prev = train_vals[-1] if train_vals else 0.0
    errors = []
    for v in test_vals:
        errors.append(abs(v - prev))
        prev = v
    return sum(errors) / len(errors) or 1.0


def run_evaluation_for_product(product_id: int):
    conn = get_db()
    c    = conn.cursor()
    c.execute("SELECT company_id FROM products WHERE product_id = ?", (product_id,))
    product_row = c.fetchone()
    if not product_row:
        conn.close()
        return
    company_id = product_row['company_id']

    c.execute("""
        SELECT date, units_sold FROM sales
        WHERE company_id = ? AND product_id = ?
        ORDER BY date ASC
    """, (company_id, product_id))
    rows = c.fetchall()

    if len(rows) < 90:
        conn.close()
        return

    train_rows = rows[-90:-30]
    test_rows  = rows[-30:]

    train_vals = [r['units_sold'] for r in train_rows]
    test_vals  = [r['units_sold'] for r in test_rows]

    # Use same model selection as forecast_service for consistency
    try:
        from services.forecast_service import _select_best_model
        _, predicted, _ = _select_best_model(train_vals, test_vals)
    except Exception:
        predicted = sum(train_vals) / len(train_vals)

    predicted    = max(0.0, predicted)
    actual_mean  = sum(test_vals) / len(test_vals)
    errors       = [predicted - v for v in test_vals]   # signed
    abs_errors   = [abs(e) for e in errors]

    n   = len(test_vals)

    # MAE
    mae = sum(abs_errors) / n

    # RMSE
    rmse = math.sqrt(sum(e ** 2 for e in errors) / n)

    # Bias (systematic over/under prediction)
    bias = sum(errors) / n

    # MAPE → Accuracy %
    if actual_mean > 0:
        mape         = (mae / actual_mean) * 100.0
        accuracy_pct = round(max(0.0, 100.0 - mape), 1)
    else:
        accuracy_pct = 0.0

    # MASE (vs naïve baseline on training window — in-sample scaled error)
    naive = _naive_mae(train_vals)
    mase  = round(mae / naive, 3) if naive else None

    # Naïve baseline on the test window (persistence model)
    naive_mae_test = _naive_mae_test(train_vals, test_vals)
    naive_mase     = round(mae / naive_mae_test, 3) if naive_mae_test else None

    # Tracking Signal (Trigg's method): |TS| > 4 = systematic drift
    cumulative_error = sum(errors)
    mad              = sum(abs_errors) / n  # same as MAE here
    tracking_signal  = round(cumulative_error / mad, 2) if mad else 0.0

    eval_period = f"{test_rows[0]['date']} to {test_rows[-1]['date']}"

    c.execute("""
        INSERT INTO evaluation
            (company_id, product_id, mae, rmse, bias, predicted_demand, actual_demand,
             accuracy_pct, mase, tracking_signal, eval_period, naive_mae, naive_mase)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (company_id,
          product_id,
          round(mae, 3),
          round(rmse, 3),
          round(bias, 3),
          round(predicted, 2),
          round(actual_mean, 2),
          accuracy_pct,
          mase,
          tracking_signal,
          eval_period,
          round(naive_mae_test, 3),
          naive_mase))

    conn.commit()
    conn.close()
