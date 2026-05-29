"""
ABC-XYZ Inventory Classification.

ABC — by revenue contribution (last 90 days of sales × unit price):
  A = top 80% of cumulative revenue   → tightest control, daily review
  B = next 15%                         → regular control, weekly review
  C = remaining 5%                     → loose control, monthly review

XYZ — by demand variability (coefficient of variation over last 90 days):
  X = CV < 0.5    → stable, highly forecastable
  Y = 0.5 ≤ CV < 1.0 → moderate variation
  Z = CV ≥ 1.0    → erratic, hard to forecast

Combined strategies:
  AX → Daily review, EOQ, tight safety stock (95% SL)
  AY → Daily review, slightly higher safety stock buffer
  AZ → Daily review, high safety stock, consider consignment
  BX → Weekly review, standard EOQ
  BY → Weekly review, moderate buffer
  BZ → Weekly review, demand-sensing approach
  CX → Monthly review, max-min ordering
  CY → Monthly review, periodic replenishment
  CZ → Monthly review or discontinue; minimal safety stock
"""
import math
from database import get_db

_STRATEGY = {
    'AX': ('Daily',   'Tight EOQ — high value, stable demand'),
    'AY': ('Daily',   'EOQ with +10% buffer — high value, moderate variation'),
    'AZ': ('Daily',   'High safety stock — high value, erratic demand'),
    'BX': ('Weekly',  'Standard EOQ — moderate value, stable demand'),
    'BY': ('Weekly',  'EOQ with buffer — moderate value, moderate variation'),
    'BZ': ('Weekly',  'Demand-sensing — moderate value, erratic demand'),
    'CX': ('Monthly', 'Min-max ordering — low value, stable demand'),
    'CY': ('Monthly', 'Periodic replenishment — low value, moderate variation'),
    'CZ': ('Monthly', 'Review for discontinuation — low value, erratic demand'),
}


def _cv(values):
    """Coefficient of Variation = std / mean."""
    n = len(values)
    if n == 0:
        return 0.0
    mean = sum(values) / n
    if mean == 0:
        return 0.0
    variance = sum((x - mean) ** 2 for x in values) / max(n - 1, 1)
    return math.sqrt(variance) / mean


def _xyz_class(cv_val):
    if cv_val < 0.5:
        return 'X'
    if cv_val < 1.0:
        return 'Y'
    return 'Z'


def run_classification(company_id=None):
    """Classify all active products and write results to product_classification table."""
    conn = get_db()
    c    = conn.cursor()

    # Get all active products with price
    c.execute("""
        SELECT p.product_id, p.product_name, p.price, p.company_id
        FROM products p
        WHERE p.is_active = 1
          AND (? IS NULL OR p.company_id = ?)
    """, (company_id, company_id))
    products = c.fetchall()

    if not products:
        conn.close()
        return []

    product_data = []
    for p in products:
        pid   = p['product_id']
        price = float(p['price'] or 0.0)

        # Last 90 days of sales
        c.execute("""
            SELECT units_sold FROM sales
            WHERE product_id = ?
              AND (? IS NULL OR company_id = ?)
            ORDER BY date DESC
            LIMIT 90
        """, (pid, company_id, company_id))
        sales = [r['units_sold'] for r in c.fetchall()]

        if not sales:
            continue

        total_units   = sum(sales)
        revenue       = total_units * price
        cv_val        = round(_cv(sales), 3)

        product_data.append({
            'product_id': pid,
            'name':       p['product_name'],
            'revenue':    revenue,
            'cv':         cv_val,
            'company_id': p['company_id'],
        })

    if not product_data:
        conn.close()
        return []

    # ── ABC classification ────────────────────────────────────────────────────
    product_data.sort(key=lambda x: x['revenue'], reverse=True)
    total_revenue = sum(d['revenue'] for d in product_data)

    cumulative = 0.0
    for d in product_data:
        cumulative += d['revenue']
        pct = (cumulative / total_revenue * 100) if total_revenue else 0
        if pct <= 80:
            d['abc'] = 'A'
        elif pct <= 95:
            d['abc'] = 'B'
        else:
            d['abc'] = 'C'
        d['revenue_pct'] = round(d['revenue'] / total_revenue * 100, 1) if total_revenue else 0

    # ── XYZ classification ────────────────────────────────────────────────────
    for d in product_data:
        d['xyz'] = _xyz_class(d['cv'])

    # ── Write to DB ───────────────────────────────────────────────────────────
    for d in product_data:
        combined  = d['abc'] + d['xyz']
        freq, strategy = _STRATEGY.get(combined, ('Weekly', 'Standard ordering'))

        c.execute("""
            INSERT OR REPLACE INTO product_classification
                (company_id, product_id, abc_class, xyz_class, combined_class,
                 revenue_contribution, cv, review_frequency, strategy)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (d['company_id'], d['product_id'], d['abc'], d['xyz'], combined,
              d['revenue_pct'], d['cv'], freq, strategy))

    conn.commit()
    conn.close()

    import logging; logging.getLogger(__name__).info("ABC-XYZ classification complete: %d products.", len(product_data))
    return product_data
