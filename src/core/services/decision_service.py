"""
Decision output layer — reads latest forecast and generates an actionable decision.

Actions (priority order):
  INACTIVE  → product.is_active = 0
  REORDER   → stock < safety_stock  (urgent)
  AT_RISK   → safety_stock <= stock < reorder_point
  OVERSTOCK → stock > 3x reorder_point
  HOLD      → stock >= reorder_point

Reason text is enriched with:
  - Stockout probability during lead time
  - Demand trend direction (INCREASING / DECREASING / STABLE)
  - EOQ-based order quantity
"""
from database import get_db


def compute_decision_for_product(product_id: int):
    conn = get_db()
    c    = conn.cursor()

    c.execute("SELECT company_id, is_active FROM products WHERE product_id = ?", (product_id,))
    product = c.fetchone()
    if not product:
        conn.close()
        return
    company_id = product['company_id']

    if not product['is_active']:
        c.execute("""
            INSERT INTO decisions (company_id, product_id, action, reason)
            VALUES (?, ?, 'INACTIVE', 'Product is marked inactive. No reorder action required.')
        """, (company_id, product_id))
        conn.commit()
        conn.close()
        return

    c.execute("""
        SELECT forecast_demand, safety_stock, reorder_point, order_quantity,
               stockout_prob, trend_direction, trend_slope, model_used
        FROM forecast
        WHERE company_id = ? AND product_id = ?
        ORDER BY created_at DESC
        LIMIT 1
    """, (company_id, product_id))
    fc = c.fetchone()

    c.execute("SELECT stock_on_hand FROM inventory WHERE company_id = ? AND product_id = ?", (company_id, product_id))
    inv = c.fetchone()

    if not fc or not inv:
        c.execute("""
            INSERT INTO decisions (company_id, product_id, action, reason)
            VALUES (?, ?, 'HOLD', ?)
        """, (company_id, product_id,
              'No forecast data available. Upload at least 30 days of sales data to enable automatic decisions.'))
        conn.commit()
        conn.close()
        return

    # Insufficient data placeholder written by forecast service
    if fc['model_used'] == 'N/A':
        c.execute("""
            INSERT INTO decisions (company_id, product_id, action, reason)
            VALUES (?, ?, 'HOLD', ?)
        """, (company_id, product_id,
              'Insufficient sales history for this product. At least 30 days of data are needed for forecasting. '
              'Upload more sales data to enable automatic reorder decisions.'))
        conn.commit()
        conn.close()
        return

    stock         = inv['stock_on_hand']
    safety_stock  = fc['safety_stock']
    reorder_pt    = fc['reorder_point']
    order_qty     = int(fc['order_quantity'])
    stockout_prob = fc['stockout_prob'] or 0.0
    trend_dir     = fc['trend_direction'] or 'STABLE'
    slope         = fc['trend_slope'] or 0.0
    model_used    = fc['model_used'] or 'SMA'

    # Trend annotation
    trend_note = ''
    if trend_dir == 'INCREASING':
        trend_note = f' Demand is trending UP (+{abs(slope):.2f} units/day) — consider ordering more.'
    elif trend_dir == 'DECREASING':
        trend_note = f' Demand is trending DOWN (−{abs(slope):.2f} units/day) — monitor for excess stock.'

    # Stockout annotation
    so_note = f' Stockout probability over lead time: {stockout_prob:.1f}%.'

    if stock < safety_stock:
        action = 'REORDER'
        reason = (
            f"Stock ({stock} units) is below safety stock ({safety_stock:.1f} units). "
            f"Urgent reorder of {order_qty} units recommended (EOQ).{so_note}{trend_note}"
        )
    elif stock < reorder_pt:
        action = 'AT_RISK'
        reason = (
            f"Stock ({stock} units) is below reorder point ({reorder_pt:.1f} units). "
            f"Consider ordering {order_qty} units soon (EOQ).{so_note}{trend_note}"
        )
    elif reorder_pt > 0 and stock > reorder_pt * 3:
        action = 'OVERSTOCK'
        reason = (
            f"Stock ({stock} units) is more than three times the reorder point ({reorder_pt:.1f} units). "
            f"Pause purchasing and consider markdowns, bundles, or supplier order reductions.{so_note}{trend_note}"
        )
    else:
        action = 'HOLD'
        reason = (
            f"Stock ({stock} units) is above reorder point ({reorder_pt:.1f} units). "
            f"No immediate action required.{so_note}{trend_note}"
        )

    c.execute("""
        INSERT INTO decisions (company_id, product_id, action, reason)
        VALUES (?, ?, ?, ?)
    """, (company_id, product_id, action, reason))

    conn.commit()
    conn.close()
