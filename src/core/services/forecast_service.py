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
