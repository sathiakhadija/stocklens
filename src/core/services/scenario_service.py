"""
Scenario comparison: "with system" vs "without system" over a 90-day simulation.

WITHOUT system (reactive):
  Reorder only when stock hits 0. Results in stockouts and delayed recovery.

WITH system (proactive):
  Reorder when stock <= reorder_point. Prevents stockouts, reduces overstock.

Metrics per scenario:
  stockout_days  - days where demand could not be fully met
  overstock_days - days where stock > 3x reorder_point
  total_reorders - number of reorder events triggered
"""
import json
from database import get_db

LEAD_TIME   = 7


def _simulate(daily_demand, initial_stock, reorder_point, order_qty, reactive=False):
    stock           = initial_stock
    stockout_days   = 0
    overstock_days  = 0
    total_reorders  = 0
    pending_qty     = 0
    pending_in      = 0  # days until delivery arrives

    for units in daily_demand:
        # Receive delivery
        if pending_in > 0:
            pending_in -= 1
            if pending_in == 0:
                stock += pending_qty
                pending_qty = 0

        # Decide whether to reorder
        if pending_qty == 0:
            if reactive:
                if stock <= 0:
                    pending_qty = order_qty
                    pending_in  = LEAD_TIME
                    total_reorders += 1
            else:
                if stock <= reorder_point:
                    pending_qty = order_qty
                    pending_in  = LEAD_TIME
                    total_reorders += 1

        # Fulfil demand
        if stock >= units:
            stock -= units
        else:
            stockout_days += 1
            stock = 0

        # Check overstock
        if reorder_point > 0 and stock > reorder_point * 3:
            overstock_days += 1

    return {
        "stockout_days":  stockout_days,
        "overstock_days": overstock_days,
        "total_reorders": total_reorders,
        "final_stock":    stock,
    }


def run_scenario_comparison(company_id=None):
    conn = get_db()
    c    = conn.cursor()

    c.execute("""
        SELECT p.product_id, p.product_name,
               f.reorder_point, f.order_quantity,
               i.stock_on_hand
        FROM products p
        JOIN forecast  f ON p.product_id = f.product_id
        JOIN inventory i ON p.product_id = i.product_id
        WHERE p.is_active = 1
          AND (? IS NULL OR p.company_id = ?)
          AND (? IS NULL OR f.company_id = ?)
          AND (? IS NULL OR i.company_id = ?)
        ORDER BY f.created_at DESC
    """, (company_id, company_id, company_id, company_id, company_id, company_id))
    all_rows = c.fetchall()

    # De-duplicate (keep most recent forecast per product)
    seen     = set()
    products = []
    for r in all_rows:
        if r['product_id'] not in seen:
            seen.add(r['product_id'])
            products.append(r)

    results = []
    for p in products:
        pid = p['product_id']
        c.execute("""
            SELECT units_sold FROM sales
            WHERE product_id = ?
              AND (? IS NULL OR company_id = ?)
            ORDER BY date DESC
            LIMIT 90
        """, (pid, company_id, company_id))
        sales = [r['units_sold'] for r in reversed(c.fetchall())]

        if len(sales) < 30:
            continue

        reorder_pt = max(float(p['reorder_point'] or 1), 1.0)
        order_qty  = max(int(p['order_quantity']  or 1), 1)
        init_stock = max(int(p['stock_on_hand']), 10)

        without = _simulate(sales, init_stock, reorder_pt, order_qty, reactive=True)
        with_s  = _simulate(sales, init_stock, reorder_pt, order_qty, reactive=False)

        results.append({
            "product_id":   pid,
            "product_name": p['product_name'],
            "without_system": without,
            "with_system":    with_s,
            "improvement": {
                "stockout_reduction":  without["stockout_days"]  - with_s["stockout_days"],
                "overstock_reduction": without["overstock_days"] - with_s["overstock_days"],
            },
        })

    if company_id is not None:
        c.execute("DELETE FROM scenario_results WHERE company_id = ?", (company_id,))
        for result in results:
            c.execute(
                """
                INSERT INTO scenario_results (company_id, product_id, product_name, result_json)
                VALUES (?, ?, ?, ?)
                """,
                (company_id, result.get('product_id'), result.get('product_name'), json.dumps(result)),
            )
        conn.commit()
    conn.close()

    import logging; logging.getLogger(__name__).info("Scenario comparison saved: %d products.", len(results))
    return results


def load_scenario_results(company_id=None):
    if company_id is None:
        return []
    conn = get_db()
    c = conn.cursor()
    c.execute(
        """
        SELECT result_json FROM scenario_results
        WHERE company_id = ?
        ORDER BY scenario_id
        """,
        (company_id,),
    )
    rows = [json.loads(r['result_json']) for r in c.fetchall()]
    conn.close()
    return rows
