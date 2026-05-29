"""
All data API routes for StockLens.

Role guards:
  - manager_only() → 403 for staff
  - login_required() → 401 for unauthenticated

Endpoints:
  GET  /api/products
  POST /api/products/<id>/toggle-status    (manager)
  GET  /api/inventory
  GET  /api/forecast                       (manager)
  GET  /api/decisions
  GET  /api/analytics/sales
  GET  /api/analytics/forecast-vs-actual
  GET  /api/analytics/inventory
  GET  /api/evaluation                     (manager)
  GET  /api/scenario                       (manager)
  POST /api/upload/sales                   (manager) CSV upload → re-run pipeline
  GET  /api/upload/sample-csv              (manager) Download sample CSV template
"""
import io
import csv
import json
import threading
import uuid
from datetime import datetime
from flask import Blueprint, current_app, jsonify, request, session, Response
from auth_utils import api_login_required, api_manager_only, require_company
from database import get_db
from services.scenario_service import load_scenario_results

api = Blueprint('api', __name__)

try:
    from dateutil import parser as date_parser
except Exception:
    date_parser = None


# ── helpers ────────────────────────────────────────────────────────────────────

def login_required():
    return api_login_required()


def manager_only():
    return api_manager_only()


def row_to_dict(row):
    return dict(row)


def _compute_data_quality(company_id, affected_pids, total_rows, total_skipped_dups, total_skipped_ret):
    total_parsed  = total_rows + total_skipped_dups + total_skipped_ret
    quality_score = round((total_rows / total_parsed * 100), 1) if total_parsed > 0 else 100.0
    if quality_score >= 85:
        quality_label = 'Good'
    elif quality_score >= 60:
        quality_label = 'Fair'
    else:
        quality_label = 'Poor'

    below_threshold = 0
    at_threshold    = 0
    warnings        = []

    if affected_pids:
        conn = get_db()
        c    = conn.cursor()
        placeholders = ','.join('?' * len(affected_pids))
        c.execute(
            f"SELECT product_id, COUNT(*) as cnt FROM sales "
            f"WHERE company_id = ? AND product_id IN ({placeholders}) "
            f"GROUP BY product_id",
            [company_id, *list(affected_pids)],
        )
        for row in c.fetchall():
            if row['cnt'] < 30:
                below_threshold += 1
            elif row['cnt'] < 90:
                at_threshold += 1

        c.execute(
            "SELECT COUNT(*) as cnt FROM products "
            "WHERE company_id = ? AND (price IS NULL OR price = 0)",
            (company_id,),
        )
        null_price = c.fetchone()['cnt']
        conn.close()

        if null_price:
            s = 's' if null_price > 1 else ''
            warnings.append(f"{null_price} product{s} have no price — ABC classification may be inaccurate")

    if below_threshold:
        s = 's' if below_threshold > 1 else ''
        warnings.append(f"{below_threshold} product{s} have insufficient data for forecasting (< 30 days)")
    if at_threshold:
        s = 's' if at_threshold > 1 else ''
        warnings.append(f"{at_threshold} product{s} can forecast but not evaluate (30–89 days — need 90+ for accuracy metrics)")
    if total_skipped_dups:
        s = 's' if total_skipped_dups > 1 else ''
        warnings.append(f"{total_skipped_dups} duplicate row{s} detected and removed")

    return {
        'quality_score':              quality_score,
        'quality_label':              quality_label,
        'products_below_threshold':   below_threshold,
        'products_at_threshold':      at_threshold,
        'data_quality_warnings':      warnings,
    }


# ── products ───────────────────────────────────────────────────────────────────

@api.route('/products')
def get_products():
    err = login_required()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    c.execute("""
        SELECT p.product_id, p.product_name, p.sku, p.category,
               p.purchase_cost, p.price,
               p.is_active, p.is_seasonal, p.season,
               i.stock_on_hand,
               d.action AS decision
        FROM products p
        LEFT JOIN inventory i
          ON i.product_id = p.product_id AND i.company_id = p.company_id
        LEFT JOIN (
            SELECT product_id, action
            FROM decisions
            WHERE company_id = ?
              AND decision_id IN (
                SELECT MAX(decision_id) FROM decisions
                WHERE company_id = ?
                GROUP BY product_id
            )
        ) d ON p.product_id = d.product_id
        WHERE p.company_id = ?
        ORDER BY p.product_name
    """, (company_id, company_id, company_id))
    rows = [row_to_dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)


@api.route('/products/<int:product_id>/toggle-status', methods=['POST'])
def toggle_product_status(product_id):
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    c.execute(
        "SELECT is_active FROM products WHERE product_id = ? AND company_id = ?",
        (product_id, company_id),
    )
    product = c.fetchone()

    if not product:
        conn.close()
        return jsonify({'message': 'Product not found'}), 404

    new_status = 0 if product['is_active'] else 1
    c.execute(
        "UPDATE products SET is_active = ? WHERE product_id = ? AND company_id = ?",
        (new_status, product_id, company_id),
    )
    c.execute("DELETE FROM forecast WHERE company_id = ? AND product_id = ?", (company_id, product_id))
    c.execute("DELETE FROM decisions WHERE company_id = ? AND product_id = ?", (company_id, product_id))
    c.execute("DELETE FROM evaluation WHERE company_id = ? AND product_id = ?", (company_id, product_id))
    conn.commit()
    conn.close()

    from services.forecast_service import run_forecast_for_product
    from services.decision_service import compute_decision_for_product
    from services.evaluation_service import run_evaluation_for_product

    run_forecast_for_product(product_id, new_status)
    compute_decision_for_product(product_id)
    if new_status:
        run_evaluation_for_product(product_id)

    return jsonify({'product_id': product_id, 'is_active': new_status})


# ── inventory ──────────────────────────────────────────────────────────────────

@api.route('/inventory')
def get_inventory():
    err = login_required()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    c.execute("""
        SELECT i.inventory_id, i.product_id, p.product_name, p.category,
               i.stock_on_hand, i.last_updated,
               f.reorder_point, f.order_quantity, f.safety_stock, f.risk_flag
        FROM inventory i
        JOIN products p ON i.product_id = p.product_id
        LEFT JOIN (
            SELECT product_id, reorder_point, order_quantity, safety_stock, risk_flag
            FROM forecast
            WHERE company_id = ?
              AND rec_id IN (
                SELECT MAX(rec_id) FROM forecast
                WHERE company_id = ?
                GROUP BY product_id
            )
        ) f ON i.product_id = f.product_id
        WHERE i.company_id = ? AND p.company_id = ?
        ORDER BY p.product_name
    """, (company_id, company_id, company_id, company_id))
    rows = [row_to_dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)


# ── forecast (manager only) ────────────────────────────────────────────────────

@api.route('/forecast')
def get_forecast():
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    c.execute("""
        SELECT f.rec_id, f.product_id, p.product_name, p.category,
               f.forecast_demand, f.safety_stock, f.reorder_point,
               f.order_quantity, f.risk_flag, f.created_at,
               f.model_used, f.lower_bound, f.upper_bound,
               f.stockout_prob, f.trend_slope, f.trend_direction
        FROM forecast f
        JOIN products p ON f.product_id = p.product_id
        WHERE f.company_id = ?
          AND p.company_id = ?
          AND f.rec_id IN (
            SELECT MAX(rec_id) FROM forecast
            WHERE company_id = ?
            GROUP BY product_id
        )
        ORDER BY p.product_name
    """, (company_id, company_id, company_id))
    rows = [row_to_dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)


# ── decisions ──────────────────────────────────────────────────────────────────

@api.route('/decisions')
def get_decisions():
    err = login_required()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    is_manager = session.get('role') == 'manager'

    conn = get_db()
    c    = conn.cursor()

    if is_manager:
        c.execute("""
            SELECT d.decision_id, d.product_id, p.product_name, p.category,
                   d.action, d.reason, d.created_at,
                   f.forecast_demand, f.risk_flag, f.lower_bound, f.upper_bound,
                   f.reorder_point, f.order_quantity, f.safety_stock,
                   f.stockout_prob, f.model_used, f.trend_direction,
                   pr.log_id AS pending_reorder_id,
                   pr.quantity_ordered AS pending_quantity_ordered,
                   DATE(pr.ordered_at, '+' || pr.expected_days || ' days') AS pending_expected_arrival
            FROM decisions d
            JOIN products p ON d.product_id = p.product_id
            LEFT JOIN (
                SELECT product_id, forecast_demand, risk_flag, lower_bound, upper_bound,
                       reorder_point, order_quantity, safety_stock,
                       stockout_prob, model_used, trend_direction
                FROM forecast
                WHERE company_id = ?
                  AND rec_id IN (
                    SELECT MAX(rec_id) FROM forecast
                    WHERE company_id = ?
                    GROUP BY product_id
                )
            ) f ON d.product_id = f.product_id
            LEFT JOIN reorder_log pr
              ON pr.product_id = d.product_id
             AND pr.company_id = d.company_id
             AND pr.status = 'pending'
             AND pr.log_id = (
                SELECT MAX(log_id)
                FROM reorder_log
                WHERE company_id = d.company_id
                  AND product_id = d.product_id
                  AND status = 'pending'
             )
            WHERE d.company_id = ? AND p.company_id = ?
              AND d.decision_id IN (
                SELECT MAX(decision_id) FROM decisions
                WHERE company_id = ?
                GROUP BY product_id
            )
            ORDER BY
                CASE d.action
                    WHEN 'REORDER'   THEN 1
                    WHEN 'AT_RISK'   THEN 2
                    WHEN 'OVERSTOCK' THEN 3
                    WHEN 'HOLD'      THEN 4
                    WHEN 'INACTIVE'  THEN 5
                END
        """, (company_id, company_id, company_id, company_id, company_id))
    else:
        # Staff: simplified view — action, stock level, and recommended order qty
        c.execute("""
            SELECT d.decision_id, d.product_id, p.product_name, p.category,
                   d.action, d.created_at,
                   i.stock_on_hand,
                   f.order_quantity, f.forecast_demand
            FROM decisions d
            JOIN products p ON d.product_id = p.product_id
            LEFT JOIN inventory i ON i.product_id = d.product_id AND i.company_id = d.company_id
            LEFT JOIN (
                SELECT product_id, order_quantity, forecast_demand
                FROM forecast
                WHERE company_id = ?
                  AND rec_id IN (
                    SELECT MAX(rec_id) FROM forecast
                    WHERE company_id = ?
                    GROUP BY product_id
                )
            ) f ON d.product_id = f.product_id
            WHERE d.company_id = ? AND p.company_id = ?
              AND d.decision_id IN (
                SELECT MAX(decision_id) FROM decisions
                WHERE company_id = ?
                GROUP BY product_id
            )
            ORDER BY
                CASE d.action
                    WHEN 'REORDER'   THEN 1
                    WHEN 'AT_RISK'   THEN 2
                    WHEN 'OVERSTOCK' THEN 3
                    WHEN 'HOLD'      THEN 4
                    WHEN 'INACTIVE'  THEN 5
                END
        """, (company_id, company_id, company_id, company_id, company_id))

    rows = [row_to_dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)


@api.route('/decisions/history')
def get_decision_history():
    err = login_required()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    product_id = request.args.get('product_id', type=int)
    conn = get_db()
    c = conn.cursor()
    params = [company_id, company_id]
    where_product = ''
    if product_id:
        where_product = 'AND d.product_id = ?'
        params.append(product_id)
    c.execute(f"""
        SELECT d.decision_id, d.product_id, p.product_name, d.action, d.reason, d.created_at,
               rl.log_id, rl.status AS reorder_status, rl.quantity_ordered,
               rl.actual_quantity, rl.ordered_at, rl.delivered_at
        FROM decisions d
        JOIN products p ON p.product_id = d.product_id AND p.company_id = ?
        LEFT JOIN reorder_log rl
          ON rl.product_id = d.product_id
         AND rl.company_id = d.company_id
         AND rl.ordered_at >= d.created_at
        WHERE d.company_id = ? {where_product}
        ORDER BY d.created_at DESC, d.decision_id DESC
        LIMIT 200
    """, params)
    rows = [row_to_dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)


@api.route('/decisions/export.csv')
def export_decisions_csv():
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c = conn.cursor()
    c.execute("""
        SELECT p.product_name, p.category, d.action, d.reason,
               f.forecast_demand, f.reorder_point, f.order_quantity,
               f.safety_stock, f.stockout_prob, f.model_used, d.created_at
        FROM decisions d
        JOIN products p ON d.product_id = p.product_id
        LEFT JOIN (
            SELECT product_id, forecast_demand, reorder_point, order_quantity,
                   safety_stock, stockout_prob, model_used
            FROM forecast
            WHERE company_id = ?
              AND rec_id IN (
                SELECT MAX(rec_id) FROM forecast
                WHERE company_id = ?
                GROUP BY product_id
              )
        ) f ON d.product_id = f.product_id
        WHERE d.company_id = ? AND p.company_id = ?
          AND d.decision_id IN (
            SELECT MAX(decision_id) FROM decisions
            WHERE company_id = ?
            GROUP BY product_id
          )
        ORDER BY
          CASE d.action
            WHEN 'REORDER' THEN 1
            WHEN 'AT_RISK' THEN 2
            WHEN 'OVERSTOCK' THEN 3
            WHEN 'HOLD' THEN 4
            WHEN 'INACTIVE' THEN 5
          END,
          p.product_name
    """, (company_id, company_id, company_id, company_id, company_id))

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'product_name', 'category', 'decision', 'recommended_order_qty',
        'reorder_point', 'safety_stock', 'forecast_demand_per_day',
        'stockout_probability_pct', 'model_used', 'reason', 'created_at',
    ])
    for row in c.fetchall():
        writer.writerow([
            row['product_name'], row['category'], row['action'],
            row['order_quantity'] if row['order_quantity'] is not None else '',
            row['reorder_point'] if row['reorder_point'] is not None else '',
            row['safety_stock'] if row['safety_stock'] is not None else '',
            row['forecast_demand'] if row['forecast_demand'] is not None else '',
            row['stockout_prob'] if row['stockout_prob'] is not None else '',
            row['model_used'] or '',
            row['reason'] or '',
            row['created_at'] or '',
        ])
    conn.close()
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=stocklens_decisions.csv'},
    )


# ── analytics ──────────────────────────────────────────────────────────────────

@api.route('/analytics/sales')
def analytics_sales():
    err = login_required()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    # Last 30 days of daily sales for the top-5 products by total units
    conn = get_db()
    c    = conn.cursor()

    c.execute("""
        SELECT product_id, SUM(units_sold) AS total
        FROM sales
        WHERE company_id = ?
        GROUP BY product_id
        ORDER BY total DESC
        LIMIT 5
    """, (company_id,))
    top5 = [r['product_id'] for r in c.fetchall()]

    c.execute("""
        SELECT MAX(date) FROM sales
        WHERE company_id = ?
    """, (company_id,))
    max_date = c.fetchone()[0]

    data = {}
    for pid in top5:
        c.execute("""
            SELECT p.product_name, s.date, s.units_sold
            FROM sales s
            JOIN products p ON s.product_id = p.product_id
            WHERE s.product_id = ?
              AND s.company_id = ?
              AND p.company_id = ?
              AND s.date >= DATE(?, '-30 days')
            ORDER BY s.date ASC
        """, (pid, company_id, company_id, max_date))
        rows = c.fetchall()
        if rows:
            name = rows[0]['product_name']
            data[name] = {
                'dates':  [r['date']       for r in rows],
                'units':  [r['units_sold'] for r in rows],
            }

    conn.close()
    return jsonify(data)


@api.route('/analytics/forecast-vs-actual')
def analytics_forecast_vs_actual():
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    c.execute("""
        SELECT p.product_name, e.predicted_demand, e.actual_demand, e.accuracy_pct
        FROM evaluation e
        JOIN products p ON e.product_id = p.product_id
        WHERE e.company_id = ?
          AND p.company_id = ?
          AND e.eval_id IN (
            SELECT MAX(eval_id) FROM evaluation
            WHERE company_id = ?
            GROUP BY product_id
        )
        ORDER BY p.product_name
    """, (company_id, company_id, company_id))
    rows = [row_to_dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)


@api.route('/analytics/inventory')
def analytics_inventory():
    err = login_required()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    c.execute("""
        SELECT p.product_name, i.stock_on_hand,
               f.reorder_point, f.safety_stock, f.risk_flag
        FROM inventory i
        JOIN products p ON i.product_id = p.product_id
        LEFT JOIN (
            SELECT product_id, reorder_point, safety_stock, risk_flag
            FROM forecast
            WHERE company_id = ?
              AND rec_id IN (
                SELECT MAX(rec_id) FROM forecast
                WHERE company_id = ?
                GROUP BY product_id
            )
        ) f ON i.product_id = f.product_id
        WHERE i.company_id = ? AND p.company_id = ?
        ORDER BY i.stock_on_hand DESC
    """, (company_id, company_id, company_id, company_id))
    rows = [row_to_dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)


# ── evaluation (manager only) ──────────────────────────────────────────────────

@api.route('/evaluation')
def get_evaluation():
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    c.execute("""
        SELECT p.product_name, p.category,
               e.predicted_demand, e.actual_demand,
               e.mae, e.rmse, e.bias, e.mase, e.tracking_signal,
               e.accuracy_pct, e.eval_period, e.naive_mae, e.naive_mase
        FROM evaluation e
        JOIN products p ON e.product_id = p.product_id
        WHERE e.company_id = ?
          AND p.company_id = ?
          AND e.eval_id IN (
            SELECT MAX(eval_id) FROM evaluation
            WHERE company_id = ?
            GROUP BY product_id
        )
        ORDER BY e.accuracy_pct DESC
    """, (company_id, company_id, company_id))
    rows = [row_to_dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)


@api.route('/classification')
def get_classification():
    """Return ABC-XYZ classification for all active products (manager only)."""
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    c.execute("""
        SELECT p.product_name, p.category, p.price,
               cl.abc_class, cl.xyz_class, cl.combined_class,
               cl.revenue_contribution, cl.cv,
               cl.review_frequency, cl.strategy, cl.classified_at
        FROM product_classification cl
        JOIN products p ON cl.product_id = p.product_id
        WHERE cl.company_id = ? AND p.company_id = ?
        ORDER BY cl.abc_class, cl.xyz_class, p.product_name
    """, (company_id, company_id))
    rows = [row_to_dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)


# ── scenario (manager only) ────────────────────────────────────────────────────

@api.route('/scenario')
def get_scenario():
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    results = load_scenario_results(company_id=company_id)
    return jsonify(results)


@api.route('/scenario', methods=['POST'])
@api.route('/scenario/run', methods=['POST'])
def run_scenario_custom():
    """
    Interactive scenario builder — run a custom simulation without touching the DB.

    Body (JSON):
      demand_shock   float  — demand multiplier, e.g. 1.30 = +30%, 0.80 = -20%
      lead_time      int    — supplier lead time in days (default 7)
      horizon        int    — simulation horizon in days (30 / 60 / 90)
      product_ids    list   — optional list of product_ids; omit = all active
    """
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    body          = request.get_json(silent=True) or {}
    demand_shock  = max(0.1, min(5.0, float(body.get('demand_shock', 1.0))))
    lead_time     = max(1, min(60, int(body.get('lead_time', 7))))
    horizon       = max(7, min(180, int(body.get('horizon', 90))))
    product_ids   = body.get('product_ids') or []

    conn = get_db()
    c    = conn.cursor()

    if product_ids:
        placeholders = ','.join('?' * len(product_ids))
        c.execute(f"""
            SELECT p.product_id, p.product_name,
                   f.reorder_point, f.order_quantity, i.stock_on_hand
            FROM products p
            JOIN forecast  f ON p.product_id = f.product_id
            JOIN inventory i ON p.product_id = i.product_id
            WHERE p.company_id = ? AND f.company_id = ? AND i.company_id = ?
              AND p.is_active = 1 AND p.product_id IN ({placeholders})
              AND f.rec_id IN (
                  SELECT MAX(rec_id) FROM forecast
                  WHERE company_id = ?
                  GROUP BY product_id
              )
        """, [company_id, company_id, company_id, *product_ids, company_id])
    else:
        c.execute("""
            SELECT p.product_id, p.product_name,
                   f.reorder_point, f.order_quantity, i.stock_on_hand
            FROM products p
            JOIN forecast  f ON p.product_id = f.product_id
            JOIN inventory i ON p.product_id = i.product_id
            WHERE p.company_id = ? AND f.company_id = ? AND i.company_id = ?
              AND p.is_active = 1
              AND f.rec_id IN (
                  SELECT MAX(rec_id) FROM forecast
                  WHERE company_id = ?
                  GROUP BY product_id
              )
        """, (company_id, company_id, company_id, company_id))
    products = c.fetchall()

    from services.scenario_service import _simulate

    results = []
    for p in products:
        pid = p['product_id']
        c.execute("""
            SELECT units_sold FROM sales
            WHERE product_id = ? AND company_id = ? ORDER BY date DESC LIMIT ?
        """, (pid, company_id, horizon))
        raw_sales = [r['units_sold'] for r in reversed(c.fetchall())]

        if len(raw_sales) < max(7, horizon // 3):
            continue

        # Apply demand shock
        sales = [max(0, round(v * demand_shock)) for v in raw_sales[:horizon]]

        reorder_pt = max(float(p['reorder_point'] or 1), 1.0)
        order_qty  = max(int(p['order_quantity'] or 1), 1)
        init_stock = max(int(p['stock_on_hand']), 10)

        def sim(reactive):
            stock = init_stock; so = 0; ov = 0; ro = 0; pq = 0; pi = 0
            for units in sales:
                if pi > 0:
                    pi -= 1
                    if pi == 0:
                        stock += pq; pq = 0
                if pq == 0:
                    trigger = (stock <= 0) if reactive else (stock <= reorder_pt)
                    if trigger:
                        pq = order_qty; pi = lead_time; ro += 1
                if stock >= units:
                    stock -= units
                else:
                    so += 1; stock = 0
                if reorder_pt > 0 and stock > reorder_pt * 3:
                    ov += 1
            return {'stockout_days': so, 'overstock_days': ov, 'total_reorders': ro, 'final_stock': stock}

        without = sim(True)
        with_s  = sim(False)

        results.append({
            'product_id':   pid,
            'product_name': p['product_name'],
            'without_system': without,
            'with_system':    with_s,
            'adjusted_order_qty': max(1, round(order_qty * demand_shock)),
            'improvement': {
                'stockout_reduction':  without['stockout_days']  - with_s['stockout_days'],
                'overstock_reduction': without['overstock_days'] - with_s['overstock_days'],
            },
            'params': {'demand_shock': demand_shock, 'lead_time': lead_time, 'horizon': horizon},
        })

    conn.close()
    return jsonify(results)


# ── overview summary ───────────────────────────────────────────────────────────

@api.route('/overview')
def get_overview():
    import math
    err = login_required()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()

    # ── Basic counts ──────────────────────────────────────────────────────────
    c.execute("SELECT COUNT(*) AS n FROM products WHERE company_id = ?", (company_id,))
    total_products = c.fetchone()['n']

    c.execute("SELECT COUNT(*) AS n FROM products WHERE company_id = ? AND is_active = 1", (company_id,))
    active_products = c.fetchone()['n']

    c.execute("""
        SELECT d.action, COUNT(*) AS n
        FROM decisions d
        WHERE d.company_id = ?
          AND d.decision_id IN (
            SELECT MAX(decision_id) FROM decisions
            WHERE company_id = ?
            GROUP BY product_id
        )
        GROUP BY d.action
    """, (company_id, company_id))
    decision_counts = {r['action']: r['n'] for r in c.fetchall()}

    c.execute("""
        SELECT f.risk_flag, COUNT(*) AS n
        FROM forecast f
        WHERE f.company_id = ?
          AND f.rec_id IN (
            SELECT MAX(rec_id) FROM forecast
            WHERE company_id = ?
            GROUP BY product_id
        )
        GROUP BY f.risk_flag
    """, (company_id, company_id))
    risk_counts = {r['risk_flag']: r['n'] for r in c.fetchall()}

    # ── Legacy alerts (kept for backward compat) ──────────────────────────────
    c.execute(
        """
        SELECT p.product_name, d.action, d.created_at
        FROM decisions d
        JOIN products p ON p.product_id = d.product_id
        WHERE d.company_id = ? AND p.company_id = ?
          AND d.action IN ('REORDER', 'AT_RISK')
          AND d.decision_id IN (
            SELECT MAX(decision_id) FROM decisions
            WHERE company_id = ?
            GROUP BY product_id
          )
        ORDER BY CASE d.action WHEN 'REORDER' THEN 1 ELSE 2 END, p.product_name
        LIMIT 8
        """,
        (company_id, company_id, company_id),
    )
    alerts = [row_to_dict(r) for r in c.fetchall()]

    c.execute("""
        SELECT SUM(i.stock_on_hand * COALESCE(NULLIF(p.purchase_cost, 0), p.price, 0)) AS inventory_value
        FROM inventory i
        JOIN products p ON i.product_id = p.product_id
        WHERE i.company_id = ? AND p.company_id = ? AND p.is_active = 1
    """, (company_id, company_id))
    inv_value = c.fetchone()['inventory_value'] or 0

    # ── Urgent Actions — REORDER products enriched with stock + forecast ──────
    c.execute("""
        SELECT p.product_id, p.product_name,
               i.stock_on_hand,
               f.forecast_demand, f.reorder_point, f.order_quantity,
               f.stockout_prob, f.trend_direction,
               d.reason
        FROM decisions d
        JOIN products  p ON p.product_id = d.product_id
        JOIN inventory i ON i.product_id = d.product_id AND i.company_id = d.company_id
        JOIN forecast  f ON f.product_id = d.product_id AND f.company_id = d.company_id
        WHERE d.company_id = ? AND p.company_id = ?
          AND d.action = 'REORDER'
          AND d.decision_id IN (
            SELECT MAX(decision_id) FROM decisions WHERE company_id = ? GROUP BY product_id
          )
          AND f.rec_id IN (
            SELECT MAX(rec_id) FROM forecast WHERE company_id = ? GROUP BY product_id
          )
        ORDER BY i.stock_on_hand ASC
        LIMIT 6
    """, (company_id, company_id, company_id, company_id))
    urgent_rows = c.fetchall()

    urgent_actions = []
    for row in urgent_rows:
        fd = max(float(row['forecast_demand'] or 1), 0.1)
        stock = float(row['stock_on_hand'] or 0)
        days_left = int(round(stock / fd)) if fd > 0 else 0
        urgent_actions.append({
            'product_id':      row['product_id'],
            'product_name':    row['product_name'],
            'stock_on_hand':   int(stock),
            'days_to_stockout': max(days_left, 0),
            'reorder_qty':     int(round(float(row['order_quantity'] or 0))),
            'stockout_prob':   round(float(row['stockout_prob'] or 0), 1),
            'trend_direction': row['trend_direction'] or 'STABLE',
        })

    # ── Smart AI Recommendations ──────────────────────────────────────────────
    smart_recommendations = []
    for u in urgent_actions:
        d2s = u['days_to_stockout']
        timing = f"in approximately {d2s} day{'s' if d2s != 1 else ''}" if d2s > 0 else "imminently"
        trend_note = ''
        if u['trend_direction'] == 'INCREASING':
            trend_note = ' Demand is trending upward — consider ordering more than the EOQ.'
        elif u['trend_direction'] == 'DECREASING':
            trend_note = ' Demand is declining — verify the recommendation before ordering.'
        smart_recommendations.append({
            'product_name': u['product_name'],
            'text': (
                f"{u['product_name']} is projected to stock out {timing} "
                f"(current stock: {u['stock_on_hand']} units, stockout probability: {u['stockout_prob']}%). "
                f"Recommended order quantity: {u['reorder_qty']} units (EOQ-based).{trend_note}"
            ),
            'urgency': 'critical' if d2s <= 3 else 'warning' if d2s <= 7 else 'moderate',
        })

    # ── Recent Activity feed ──────────────────────────────────────────────────
    activity = []

    # Recent REORDER decisions
    c.execute("""
        SELECT p.product_name, d.action, d.created_at
        FROM decisions d
        JOIN products p ON p.product_id = d.product_id
        WHERE d.company_id = ? AND p.company_id = ?
          AND d.action IN ('REORDER', 'AT_RISK')
        ORDER BY d.decision_id DESC
        LIMIT 4
    """, (company_id, company_id))
    for row in c.fetchall():
        action = row['action']
        ts = (row['created_at'] or '')[:16]
        activity.append({
            'type':    'alert' if action == 'REORDER' else 'warning',
            'message': f"Stock alert triggered for {row['product_name']}",
            'time':    ts,
            'icon':    'alert-triangle',
        })

    # Recent uploads
    c.execute("""
        SELECT filename, uploaded_by, rows_inserted, uploaded_at
        FROM upload_log
        WHERE company_id = ?
        ORDER BY log_id DESC
        LIMIT 3
    """, (company_id,))
    for row in c.fetchall():
        ts = (row['uploaded_at'] or '')[:16]
        activity.append({
            'type':    'upload',
            'message': f"Sales data uploaded: {row['rows_inserted']} rows added",
            'time':    ts,
            'icon':    'upload-cloud',
        })

    # Recent reorder actions logged by managers
    try:
        c.execute("""
            SELECT rl.ordered_at, p.product_name, rl.quantity_ordered,
                   rl.ordered_by, rl.status
            FROM reorder_log rl
            JOIN products p ON rl.product_id = p.product_id
            WHERE rl.company_id = ?
            ORDER BY rl.log_id DESC
            LIMIT 3
        """, (company_id,))
        for row in c.fetchall():
            ts = (row['ordered_at'] or '')[:16]
            verb = 'delivered' if row['status'] == 'delivered' else 'placed'
            activity.append({
                'type':    'reorder',
                'message': f"Reorder {verb}: {row['quantity_ordered']} units of {row['product_name']} by {row['ordered_by']}",
                'time':    ts,
                'icon':    'shopping-cart',
            })
    except Exception:
        pass

    # Recent forecast runs (last forecast record per company)
    c.execute("""
        SELECT MAX(created_at) AS last_run FROM forecast WHERE company_id = ?
    """, (company_id,))
    frow = c.fetchone()
    if frow and frow['last_run']:
        ts = frow['last_run'][:16]
        activity.append({
            'type':    'forecast',
            'message': 'Forecast models recalculated for all products',
            'time':    ts,
            'icon':    'trending-up',
        })

    # Sort by time descending, cap at 6
    activity.sort(key=lambda x: x['time'], reverse=True)
    activity = activity[:6]

    # ── KPI Trends — last 7 days vs prior 7 days ──────────────────────────────
    # Use max sales date as reference so historical datasets show meaningful trends
    c.execute("SELECT MAX(date) AS mx FROM sales WHERE company_id = ?", (company_id,))
    _max_date_row = c.fetchone()
    _max_date = _max_date_row['mx'] if _max_date_row and _max_date_row['mx'] else None

    if _max_date:
        c.execute("""
            SELECT COALESCE(SUM(units_sold), 0) AS total
            FROM sales s
            JOIN products p ON p.product_id = s.product_id
            WHERE s.company_id = ? AND p.is_active = 1
              AND s.date >= DATE(?, '-7 days')
        """, (company_id, _max_date))
        sales_last7 = float(c.fetchone()['total'] or 0)

        c.execute("""
            SELECT COALESCE(SUM(units_sold), 0) AS total
            FROM sales s
            JOIN products p ON p.product_id = s.product_id
            WHERE s.company_id = ? AND p.is_active = 1
              AND s.date >= DATE(?, '-14 days')
              AND s.date < DATE(?, '-7 days')
        """, (company_id, _max_date, _max_date))
        sales_prev7 = float(c.fetchone()['total'] or 0)
    else:
        sales_last7 = 0.0
        sales_prev7 = 0.0

    def trend_pct(cur, prev):
        if prev == 0:
            return 0.0
        return round((cur - prev) / prev * 100, 1)

    sales_trend = trend_pct(sales_last7, sales_prev7)

    # Reorder count trend (current vs 7 days ago — approximate by comparing decision timestamps)
    reorder_count = decision_counts.get('REORDER', 0)
    at_risk_count = decision_counts.get('AT_RISK', 0)

    # ── First visit flag ──────────────────────────────────────────────────────
    is_first_visit = (total_products == 0)

    c.execute("SELECT currency_symbol FROM companies WHERE company_id = ?", (company_id,))
    currency_row = c.fetchone()
    currency_symbol = currency_row['currency_symbol'] if currency_row and currency_row['currency_symbol'] else '£'

    # ── Last forecast run timestamp ───────────────────────────────────────────
    c.execute("SELECT MAX(created_at) AS lr FROM forecast WHERE company_id = ?", (company_id,))
    fr = c.fetchone()
    last_forecast_run = fr['lr'] if fr and fr['lr'] else None

    # ── Pending reorder orders count ──────────────────────────────────────────
    pending_reorders_count = 0
    try:
        c.execute(
            "SELECT COUNT(*) AS n FROM reorder_log WHERE company_id = ? AND status = 'pending'",
            (company_id,),
        )
        pending_reorders_count = c.fetchone()['n']
    except Exception:
        pass

    # ── Data quality signals ─────────────────────────────────────────────────
    c.execute("SELECT COUNT(*) AS n FROM sales WHERE company_id = ?", (company_id,))
    sales_rows = c.fetchone()['n']

    c.execute("""
        SELECT COUNT(*) AS n
        FROM products p
        LEFT JOIN inventory i
          ON i.product_id = p.product_id AND i.company_id = p.company_id
        WHERE p.company_id = ?
          AND p.is_active = 1
          AND (i.stock_on_hand IS NULL OR i.stock_on_hand < 0)
    """, (company_id,))
    products_missing_inventory = c.fetchone()['n']

    c.execute("""
        SELECT COUNT(*) AS n
        FROM (
            SELECT p.product_id, COUNT(s.date) AS sale_rows
            FROM products p
            LEFT JOIN sales s
              ON s.product_id = p.product_id AND s.company_id = p.company_id
            WHERE p.company_id = ? AND p.is_active = 1
            GROUP BY p.product_id
            HAVING sale_rows > 0 AND sale_rows < 30
        ) low_history
    """, (company_id,))
    products_low_history = c.fetchone()['n']

    quality_issues = []
    if total_products == 0:
        quality_issues.append('No products have been uploaded yet.')
    if sales_rows == 0:
        quality_issues.append('No sales rows are available for forecasting.')
    elif sales_rows < 30:
        quality_issues.append('Forecasts may be weak because fewer than 30 sales rows are available.')
    if products_low_history:
        quality_issues.append(f'{products_low_history} active product(s) have fewer than 30 sales rows.')
    if products_missing_inventory:
        quality_issues.append(f'{products_missing_inventory} active product(s) are missing usable stock levels.')

    if not quality_issues:
        quality_status = 'good'
        quality_summary = 'Data coverage looks ready for daily decisions.'
    elif sales_rows == 0 or total_products == 0:
        quality_status = 'critical'
        quality_summary = 'Upload sales and inventory data before trusting recommendations.'
    else:
        quality_status = 'warning'
        quality_summary = 'Recommendations are usable, but a few data gaps need attention.'

    conn.close()

    return jsonify({
        'total_products':        total_products,
        'active_products':       active_products,
        'decision_counts':       decision_counts,
        'risk_counts':           risk_counts,
        'alerts':                alerts,
        'inventory_value':       round(inv_value, 2),
        'urgent_actions':        urgent_actions,
        'smart_recommendations': smart_recommendations,
        'activity':              activity,
        'kpi_trends': {
            'sales_trend':   sales_trend,
            'reorder_count': reorder_count,
            'at_risk_count': at_risk_count,
        },
        'is_first_visit':          is_first_visit,
        'last_forecast_run':       last_forecast_run,
        'pending_reorders_count':  pending_reorders_count,
        'currency_symbol':         currency_symbol,
        'data_quality': {
            'status': quality_status,
            'summary': quality_summary,
            'issues': quality_issues,
            'sales_rows': sales_rows,
            'products_low_history': products_low_history,
            'products_missing_inventory': products_missing_inventory,
        },
    })


# ── Upload — smart, schema-flexible (CSV + XLSX) ──────────────────────────────
#
# Handles ANY retail spreadsheet regardless of column naming or date format.
# Strategy:
#   1. Auto-detect date / product / units / stock columns via alias matching
#   2. Normalise dates across 12+ formats (ISO, UK, US, datetime strings)
#   3. Auto-create products that don't exist yet (category = 'Imported')
#   4. Skip negative quantities (returns / refunds) with a counter
#   5. DEDUPLICATE: skip (product, date) pairs already in the database
#   6. Update stock_on_hand if a stock column is present (uses latest-dated row)
#   7. Preview endpoint returns detected mapping + sample rows before committing
#
# Recognised column aliases
_DATE_ALIASES    = {'date','Date','sale_date','saledate','invoice_date','invoicedate',
                    'transaction_date','transactiondate','order_date','orderdate',
                    'purchase_date','day','InvoiceDate','invoice date','sale date',
                    'solddate','sold_date','timestamp','time stamp','sale time',
                    'event time','event_time','order time','order_time','created_at',
                    'created at','transaction time','transaction_time','invoice_date'}
_PRODUCT_ALIASES = {'product_name','productname','product','item','item_name','itemname',
                    'description','Description','product_description','name','Name',
                    'Product Name','Product','Item','Item Name','StockCode','stock_code',
                    'sku','SKU','article','Article','Product Description','product desc',
                    'prod_name','prod name','product title','title',
                    'product id','product_id','item id','item_id','productid',
                    'prod_id','prod id','asin','barcode','upc'}
_UNITS_ALIASES   = {'units_sold','unitssold','quantity','qty','Quantity','Qty','units',
                    'Units','sales','Sales','amount','count','sold','Quantity Sold',
                    'quantity_sold','vol','volume','num_sold','number_sold','no_sold',
                    'items_sold','transactions','Units Sold'}
_PRICE_ALIASES   = {'price','Price','unit_price','unitprice','UnitPrice','cost',
                    'unit_cost','retail_price','sale_price','item_price','price each',
                    'unit price','selling_price','selling price'}
_STOCK_ALIASES   = {'stock_on_hand','stock','current_stock','inventory','stock_level',
                    'on_hand','onhand','closing_stock','balance','stock_balance',
                    'current_inventory','inventory_level','stock_qty','remaining'}

# Interaction log detection — if these columns exist it's an event log, not a sales summary
_INTERACTION_ALIASES = {'interaction_type','interactiontype','event_type','eventtype',
                        'event','action','activity','interaction','behavior','behaviour',
                        'event_name','type','interaction type','event type',
                        'activity type','behavior type','action type','event category'}
_PURCHASE_KEYWORDS   = {'purchase','buy','bought','order','checkout','sale','sold',
                        'transaction','purchase_event','buy_event','add_to_cart_and_buy',
                        'ordered','paid','conversion','complete','completed',
                        'order_placed','placed order','payment'}


def _is_purchase_event(val):
    """Return True if an interaction-type value represents a purchase."""
    return str(val).strip().lower() in _PURCHASE_KEYWORDS


def _aggregate_interaction_log(rows, hmap):
    """
    Convert an interaction log (one row per event) into aggregated sales rows.
    Groups by (product, date) where interaction_type is a purchase keyword.
    Returns (new_rows, interaction_col, original_product_col, original_date_col)
    """
    date_col        = _match_col(hmap, _DATE_ALIASES)
    product_col     = _match_col(hmap, _PRODUCT_ALIASES)
    interaction_col = _match_col(hmap, _INTERACTION_ALIASES)
    price_col       = _match_col(hmap, _PRICE_ALIASES)

    if not date_col or not product_col or not interaction_col:
        return None, interaction_col, product_col, date_col

    # Aggregate: count purchase events per (product, date)
    counts = {}
    prices = {}
    for row in rows:
        int_val = str(row.get(interaction_col, '') or '').strip()
        if not _is_purchase_event(int_val):
            continue
        date_raw    = str(row.get(date_col,    '') or '').strip()
        product_raw = str(row.get(product_col, '') or '').strip()
        if not date_raw or not product_raw:
            continue
        date_val = _normalise_date(date_raw)
        if not date_val:
            continue
        key = (product_raw, date_val)
        counts[key] = counts.get(key, 0) + 1
        if price_col and key not in prices:
            try:
                prices[key] = float(str(row.get(price_col, '') or '').replace('£','').replace('$','').replace(',','').strip())
            except ValueError:
                pass

    # Rebuild as synthetic rows with standard column names
    synthetic = []
    for (product_raw, date_val), units in counts.items():
        r = {'date': date_val, 'product_name': product_raw, 'units_sold': units}
        if price_col and (product_raw, date_val) in prices:
            r['price'] = prices[(product_raw, date_val)]
        synthetic.append(r)

    return synthetic, interaction_col, product_col, date_col

_DATE_FORMATS = [
    '%Y-%m-%d','%d/%m/%Y','%m/%d/%Y','%d-%m-%Y','%m-%d-%Y','%Y/%m/%d',
    '%d %b %Y','%d %B %Y','%B %d %Y','%b %d %Y',
    '%Y-%m-%d %H:%M:%S','%Y-%m-%dT%H:%M:%S','%d/%m/%Y %H:%M',
    '%m/%d/%Y %H:%M','%m/%d/%Y %H:%M:%S','%d/%m/%Y %H:%M:%S',
    '%Y-%m-%d %H:%M','%d-%m-%Y %H:%M:%S',
]


def _match_col(headers_lower_map, aliases):
    """Return the original header name whose lowercase form is in aliases, or None."""
    for alias in aliases:
        if alias.lower() in headers_lower_map:
            return headers_lower_map[alias.lower()]
    return None


def _fuzzy_match_col(hmap, col_type):
    """
    Substring fallback when no exact alias matches.
    Checks if a column name *contains* a type-specific keyword
    and does not contain a keyword that clearly belongs to another type.
    """
    _HINTS = {
        'date': (
            ['date', 'dt', 'stamp', 'when'],
            ['name', 'product', 'item', 'price', 'cost', 'qty', 'stock',
             'unit', 'sold', 'count', 'num', 'vol', 'id'],
        ),
        'product': (
            ['name', 'product', 'item', 'sku', 'code', 'desc', 'title', 'article'],
            ['date', 'time', 'qty', 'unit', 'sold', 'price', 'cost', 'money',
             'amount', 'cash', 'card', 'stock', 'total', 'revenue', 'count', 'id'],
        ),
        'units': (
            ['qty', 'quant', 'unit', 'sold', 'count', 'num', 'vol'],
            ['date', 'time', 'name', 'product', 'item', 'price', 'cost',
             'stock', 'cash', 'card', 'money', 'id'],
        ),
        'price': (
            ['price', 'cost', 'rate', 'money', 'amount', 'revenue', 'value'],
            ['date', 'time', 'name', 'product', 'item', 'stock', 'qty'],
        ),
        'stock': (
            ['stock', 'inventory', 'balance', 'remain', 'on_hand', 'onhand'],
            ['date', 'time', 'name', 'product', 'price', 'cost', 'qty', 'sold'],
        ),
    }
    hints, exclude = _HINTS.get(col_type, ([], []))
    for lower_key, orig_key in hmap.items():
        if any(ex in lower_key for ex in exclude):
            continue
        if any(hint in lower_key for hint in hints):
            return orig_key
    return None


def _aggregate_as_transaction_log(rows, date_col, product_col, price_col):
    """
    Each row is one transaction (no explicit quantity).
    Count occurrences per (product, date) and return synthetic rows
    with standard column names ready for _parse_stream.
    """
    counts = {}
    prices = {}
    for row in rows:
        date_raw = str(row.get(date_col, '') or '').strip()
        prod_raw = str(row.get(product_col, '') or '').strip()
        if not date_raw or not prod_raw:
            continue
        date_val = _normalise_date(date_raw)
        if not date_val:
            continue
        key = (prod_raw, date_val)
        counts[key] = counts.get(key, 0) + 1
        if price_col and key not in prices:
            try:
                prices[key] = float(
                    str(row.get(price_col, '') or '')
                    .replace('£', '').replace('$', '').replace(',', '').strip()
                )
            except (ValueError, AttributeError):
                pass
    synthetic = []
    for (prod_raw, date_val), count in counts.items():
        r = {'date': date_val, 'product_name': prod_raw, 'units_sold': count}
        if price_col and (prod_raw, date_val) in prices:
            r['price'] = prices[(prod_raw, date_val)]
        synthetic.append(r)
    new_headers = ['date', 'product_name', 'units_sold']
    if price_col:
        new_headers.append('price')
    return synthetic, new_headers


def _normalise_date(raw):
    """Try every known format; return YYYY-MM-DD string or None."""
    raw = raw.strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(raw, fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    if date_parser is not None:
        try:
            return date_parser.parse(raw, dayfirst=True).strftime('%Y-%m-%d')
        except Exception:
            pass
    return None


def _decode_csv_bytes(raw):
    """Decode uploaded bytes across common encodings."""
    for enc in ('utf-8-sig', 'utf-16', 'latin-1'):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode('utf-8', errors='ignore')


def _sniff_reader(text):
    """Build DictReader with delimiter auto-detection."""
    sample = text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=',;\t|')
        return csv.DictReader(io.StringIO(text), dialect=dialect)
    except Exception:
        return csv.DictReader(io.StringIO(text))


def _parse_units(units_raw):
    s = str(units_raw).strip()
    if not s:
        raise ValueError('empty quantity')
    s = s.replace(' ', '')
    if ',' in s and '.' in s:
        if s.rfind(',') > s.rfind('.'):
            s = s.replace('.', '').replace(',', '.')
        else:
            s = s.replace(',', '')
    elif ',' in s:
        parts = s.split(',')
        if len(parts[-1]) in (1, 2):
            s = s.replace(',', '.')
        else:
            s = s.replace(',', '')
    return int(float(s))


def _xlsx_to_dictrows(raw_bytes):
    """Parse an xlsx file; return (headers, list_of_dicts)."""
    try:
        import openpyxl
    except ImportError:
        raise ValueError('openpyxl not installed — cannot read .xlsx files')
    wb = openpyxl.load_workbook(io.BytesIO(raw_bytes), read_only=True, data_only=True)
    ws = wb.active
    all_rows = list(ws.iter_rows(values_only=True))
    wb.close()
    if not all_rows:
        return [], []
    headers = [str(h).strip() if h is not None else f'col_{i}' for i, h in enumerate(all_rows[0])]
    dict_rows = []
    for row in all_rows[1:]:
        if all(cell is None for cell in row):
            continue
        dict_rows.append({headers[i]: ('' if cell is None else str(cell)) for i, cell in enumerate(row)})
    return headers, dict_rows


def _parse_stream(rows_iter, raw_headers, name_map, c, company_id, auto_create=True, write_rows=True):
    """
    Parse an iterable of dicts (from CSV DictReader or xlsx). Supports:
      - Standard sales format: date, product, units_sold (one row per day per product)
      - Interaction log format: timestamp, product_id, interaction_type (one row per event)
        → auto-detected, purchase events aggregated into daily unit counts

    Returns:
      rows_inserted, new_products, skipped_returns, skipped_duplicates,
      inventory_updates, parse_errors, detected_cols, sample_rows, affected_product_ids
    """
    # Materialise so we can inspect for format detection
    rows = list(rows_iter)
    hmap = {h.strip().lower(): h.strip() for h in raw_headers}

    # ── Interaction-log auto-detection ────────────────────────────────────────
    # If dataset has an interaction_type column but no units column, treat it as
    # an event log and aggregate purchase events into daily unit counts.
    interaction_col_raw = _match_col(hmap, _INTERACTION_ALIASES)
    has_units           = bool(_match_col(hmap, _UNITS_ALIASES))
    format_used         = 'standard'

    if interaction_col_raw and not has_units and rows:
        aggregated, int_col, prod_col, dt_col = _aggregate_interaction_log(rows, hmap)
        if aggregated:
            # Rewrite rows + headers to standard format
            rows        = aggregated
            raw_headers = ['date', 'product_name', 'units_sold', 'price']
            hmap        = {h: h for h in raw_headers}
            format_used = f'interaction-log (filtered purchase events from "{int_col}")'
        else:
            # Aggregation found the right columns but zero purchase events
            # Give an informative error
            return 0, [], 0, 0, 0, [
                f'Detected interaction log format (column "{int_col}"). '
                f'No purchase/buy events found. '
                f'Values seen in "{int_col}": check that purchase events are labelled '
                f'"purchase", "buy", "order", "sale", "checkout", or similar.'
            ], {'all_headers': list(raw_headers), 'format': 'interaction-log',
                'date': dt_col, 'product': prod_col, 'units': None, 'price': None,
                'stock': None}, [], set()

    date_col    = _match_col(hmap, _DATE_ALIASES)    or _fuzzy_match_col(hmap, 'date')
    product_col = _match_col(hmap, _PRODUCT_ALIASES) or _fuzzy_match_col(hmap, 'product')
    units_col   = _match_col(hmap, _UNITS_ALIASES)   or _fuzzy_match_col(hmap, 'units')
    price_col   = _match_col(hmap, _PRICE_ALIASES)   or _fuzzy_match_col(hmap, 'price')
    stock_col   = _match_col(hmap, _STOCK_ALIASES)   or _fuzzy_match_col(hmap, 'stock')

    # Transaction log: date + product found but no quantity column →
    # treat every row as one sale and aggregate daily counts per product.
    if date_col and product_col and not units_col:
        rows, raw_headers = _aggregate_as_transaction_log(rows, date_col, product_col, price_col)
        hmap        = {h: h for h in raw_headers}
        date_col    = 'date'
        product_col = 'product_name'
        units_col   = 'units_sold'
        price_col   = 'price' if price_col and 'price' in raw_headers else None
        stock_col   = None
        format_used = 'transaction-log (each row = 1 sale, aggregated by product + date)'

    detected_cols = {
        'date':    date_col,
        'product': product_col,
        'units':   units_col,
        'price':   price_col,
        'stock':   stock_col,
        'format':  format_used,
        'all_headers': list(raw_headers),
    }

    if not date_col or not product_col or not units_col:
        missing = []
        if not date_col:    missing.append('date')
        if not product_col: missing.append('product/item name')
        if not units_col:   missing.append('quantity/units_sold')
        tip = (
            'Tip: rename your columns to date, product_name, units_sold '
            '(or variants like Date, Item, Quantity). '
            'If this is an e-commerce interaction log with an event type column, '
            'ensure purchase events are labelled "purchase", "buy", "order", or "sale".'
        )
        return 0, [], 0, 0, 0, [
            f'Could not detect required columns: {", ".join(missing)}. '
            f'Found: {", ".join(raw_headers) or "(none)"}. {tip}'
        ], detected_cols, [], set()

    # Load existing (product_id, date) pairs to prevent duplicates
    existing_pairs = set()
    if write_rows and name_map:
        known_pids = [v for v in name_map.values() if v > 0]
        if known_pids:
            placeholders = ','.join('?' * len(known_pids))
            c.execute(
                f'SELECT product_id, date FROM sales WHERE company_id = ? AND product_id IN ({placeholders})',
                [company_id, *known_pids],
            )
            for r in c.fetchall():
                existing_pairs.add((r[0], r[1]))

    rows_inserted      = 0
    new_products       = []
    skipped_returns    = 0
    skipped_duplicates = 0
    parse_errors       = []
    sample_rows        = []
    new_pairs          = set()
    affected_pids      = set()
    # Track latest stock value per product_id for inventory update
    latest_stock       = {}  # pid → (date_val, stock_value)

    for i, row in enumerate(rows, start=2):
        try:
            date_raw    = str(row.get(date_col,    '') or '').strip()
            product_raw = str(row.get(product_col, '') or '').strip()
            units_raw   = str(row.get(units_col,   '') or '').strip()

            if not date_raw or not product_raw or not units_raw:
                continue

            date_val = _normalise_date(date_raw)
            if date_val is None:
                parse_errors.append(f'Row {i}: unrecognised date "{date_raw}"')
                if len(parse_errors) >= 5:
                    parse_errors.append('… (further date errors suppressed)')
                    break
                continue

            try:
                units = _parse_units(units_raw)
            except ValueError:
                parse_errors.append(f'Row {i}: invalid quantity "{units_raw}"')
                continue
            if units <= 0:
                skipped_returns += 1
                continue

            # Resolve product → id
            key = product_raw.lower()
            if key not in name_map:
                if not auto_create:
                    continue
                if write_rows:
                    price = 0.0
                    if price_col and row.get(price_col):
                        try:
                            price = float(str(row[price_col]).replace('£', '').replace('$', '').replace(',', '').strip())
                        except ValueError:
                            pass
                    c.execute("""
                        INSERT INTO products (company_id, product_name, sku, category, price, is_active)
                        VALUES (?, ?, NULL, 'Imported', ?, 1)
                    """, (company_id, product_raw, round(price, 2)))
                    pid = c.lastrowid
                    c.execute("UPDATE products SET sku = ? WHERE product_id = ? AND company_id = ?", (f'SKU-{pid}', pid, company_id))
                    c.execute("""
                        INSERT OR IGNORE INTO inventory (company_id, product_id, stock_on_hand, last_updated)
                        VALUES (?, ?, 0, DATE('now'))
                    """, (company_id, pid))
                    name_map[key] = pid
                    # New product: no existing pairs to load for it
                else:
                    name_map[key] = -(len(name_map) + 1)
                new_products.append(product_raw)

            pid = name_map[key]
            if pid > 0:
                affected_pids.add(pid)

            # Deduplication
            pair = (pid, date_val)
            if pair in existing_pairs or pair in new_pairs:
                skipped_duplicates += 1
                continue

            if write_rows:
                c.execute(
                    'INSERT INTO sales (company_id, product_id, date, units_sold) VALUES (?, ?, ?, ?)',
                    (company_id, pid, date_val, units),
                )
                new_pairs.add(pair)

                # Track latest stock value per product
                if stock_col and row.get(stock_col):
                    try:
                        stock_val = int(float(str(row[stock_col]).replace(',', '').strip()))
                        if stock_val >= 0:
                            prev = latest_stock.get(pid)
                            if prev is None or date_val >= prev[0]:
                                latest_stock[pid] = (date_val, stock_val)
                    except ValueError:
                        pass
            else:
                new_pairs.add(pair)

            rows_inserted += 1
            if len(sample_rows) < 5:
                sample_rows.append({'date': date_val, 'product': product_raw, 'units': units})

        except Exception as e:
            parse_errors.append(f'Row {i}: {e}')

    # Apply stock updates from the upload
    inventory_updates = 0
    if write_rows and latest_stock:
        for pid, (_, stock_val) in latest_stock.items():
            c.execute("""
                UPDATE inventory SET stock_on_hand = ?, last_updated = DATE('now')
                WHERE company_id = ? AND product_id = ?
            """, (stock_val, company_id, pid))
            inventory_updates += 1

    return (rows_inserted, new_products, skipped_returns, skipped_duplicates,
            inventory_updates, parse_errors, detected_cols, sample_rows, affected_pids)


def _build_dictrows_from_csv(csv_text):
    """Return (headers, list_of_dicts) from CSV text."""
    reader = _sniff_reader(csv_text)
    headers = reader.fieldnames or []
    rows = list(reader)
    return headers, rows


@api.route('/upload/sample-csv')
def sample_csv():
    """Return a downloadable CSV template using the current product list."""
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    c.execute(
        "SELECT product_name FROM products WHERE company_id = ? AND is_active = 1 ORDER BY product_name LIMIT 6",
        (company_id,),
    )
    names = [r['product_name'] for r in c.fetchall()]
    conn.close()

    lines = ['date,product_name,units_sold,stock_on_hand']
    from datetime import date, timedelta
    today = date.today()
    for i in range(3):
        d = (today - timedelta(days=i)).strftime('%Y-%m-%d')
        for name in names:
            lines.append(f'{d},{name},10,')

    return Response(
        '\n'.join(lines),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=stocklens_sales_template.csv'},
    )


def _read_upload_file(file):
    """Return (headers, rows_as_dicts, total_data_rows) from a CSV or XLSX file."""
    raw = file.stream.read()
    fname = file.filename.lower()
    if fname.endswith('.xlsx') or fname.endswith('.xls'):
        headers, rows = _xlsx_to_dictrows(raw)
    else:
        csv_text = _decode_csv_bytes(raw)
        headers, rows = _build_dictrows_from_csv(csv_text)
    return headers, rows, len(rows)


@api.route('/upload/preview', methods=['POST'])
def upload_preview():
    """
    Parse uploaded files without writing to DB.
    Accepts CSV and XLSX. Returns column mapping, sample rows, new products,
    duplicate counts, and row totals so the frontend can confirm before committing.
    """
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    files = request.files.getlist('files[]') or request.files.getlist('file')
    if not files or all(f.filename == '' for f in files):
        return jsonify({'error': 'No files received.'}), 400

    conn = get_db()
    c    = conn.cursor()
    c.execute("SELECT product_id, product_name FROM products WHERE company_id = ?", (company_id,))
    name_map = {r['product_name'].lower(): r['product_id'] for r in c.fetchall()}
    conn.close()

    previews = []
    for file in files:
        fname = file.filename.lower()
        if not (fname.endswith('.csv') or fname.endswith('.xlsx') or fname.endswith('.xls')):
            previews.append({'file': file.filename, 'skipped': True, 'reason': 'Only .csv and .xlsx files are supported'})
            continue
        try:
            headers, rows, total = _read_upload_file(file)
            result = _parse_stream(
                rows, headers, dict(name_map), c, company_id, auto_create=True, write_rows=False
            )
            inserted, new_prods, skipped_ret, skipped_dups, _, errors, detected, samples, _ = result
            previews.append({
                'file':              file.filename,
                'total_rows':        total,
                'rows_importable':   inserted,
                'new_products':      new_prods,
                'skipped_returns':   skipped_ret,
                'skipped_duplicates': skipped_dups,
                'detected_cols':     detected,
                'sample_rows':       samples,
                'errors':            errors[:5],
            })
        except Exception as e:
            previews.append({'file': file.filename, 'skipped': True, 'reason': str(e)})

    return jsonify({'previews': previews})


@api.route('/upload/sales', methods=['POST'])
def upload_sales():
    """
    Accept one or more CSV or XLSX files (field name: "files[]" or "file").

    - Auto-detects date / product / units / stock / price columns
    - Parses 12+ date formats
    - Auto-creates new products (category = Imported)
    - Deduplicates: skips (product, date) rows already in the DB
    - Updates stock_on_hand if a stock column is present (uses latest-dated row)
    - Re-runs full forecast pipeline for every affected product
    - Logs each upload to upload_log table
    """
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    files = request.files.getlist('files[]') or request.files.getlist('file')
    if not files or all(f.filename == '' for f in files):
        return jsonify({'error': 'No files uploaded. Send CSV or XLSX as form-data field "files[]".'}), 400

    conn = get_db()
    c    = conn.cursor()
    c.execute("SELECT product_id, product_name FROM products WHERE company_id = ?", (company_id,))
    name_map = {r['product_name'].lower(): r['product_id'] for r in c.fetchall()}

    total_rows          = 0
    total_skipped_ret   = 0
    total_skipped_dups  = 0
    total_inv_updates   = 0
    all_new_products    = []
    affected_pids       = set()
    file_summaries      = []

    for file in files:
        fname = file.filename.lower()
        if not (fname.endswith('.csv') or fname.endswith('.xlsx') or fname.endswith('.xls')):
            file_summaries.append({'file': file.filename, 'skipped': True,
                                   'reason': 'Only .csv and .xlsx files are supported'})
            continue
        try:
            headers, rows, _ = _read_upload_file(file)
            result = _parse_stream(rows, headers, name_map, c, company_id, auto_create=True, write_rows=True)
            inserted, new_prods, skipped_ret, skipped_dups, inv_updates, errors, detected, samples, parsed_pids = result
            conn.commit()

            # Refresh name_map after potential new product inserts
            c.execute("SELECT product_id, product_name FROM products WHERE company_id = ?", (company_id,))
            name_map = {r['product_name'].lower(): r['product_id'] for r in c.fetchall()}

            # Exact affected IDs from parsed rows (new + existing products touched).
            affected_pids.update(pid for pid in parsed_pids if pid and pid > 0)

            total_rows         += inserted
            total_skipped_ret  += skipped_ret
            total_skipped_dups += skipped_dups
            total_inv_updates  += inv_updates
            all_new_products.extend(new_prods)

            # Log this file upload
            c.execute("""
                INSERT OR IGNORE INTO upload_log
                    (company_id, filename, uploaded_by, rows_inserted, new_products, skipped_duplicates, inventory_updates)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (company_id, file.filename, session.get('username', 'unknown'),
                  inserted, len(new_prods), skipped_dups, inv_updates))
            conn.commit()

            file_summaries.append({
                'file':               file.filename,
                'rows_inserted':      inserted,
                'new_products':       new_prods,
                'skipped_returns':    skipped_ret,
                'skipped_duplicates': skipped_dups,
                'inventory_updates':  inv_updates,
                'detected_cols':      detected,
                'sample_rows':        samples,
                'errors':             errors[:5],
            })
        except Exception as e:
            file_summaries.append({'file': file.filename, 'skipped': True, 'reason': str(e)})

    pipeline_job_id = None
    # Queue forecast pipeline for every affected product
    if affected_pids:
        conn.close()
        pipeline_job_id = _create_pipeline_job(company_id, product_ids=list(affected_pids))
    else:
        conn.close()

    new_unique = list(dict.fromkeys(all_new_products))

    extras = []
    if total_skipped_dups:
        extras.append(f'{total_skipped_dups} duplicate rows skipped')
    if total_skipped_ret:
        extras.append(f'{total_skipped_ret} returns/negatives skipped')
    if total_inv_updates:
        extras.append(f'{total_inv_updates} stock levels updated')

    # Cleaning summary for the UI and dissertation evidence
    cleaning_summary = {
        'rows_accepted':         total_rows,
        'duplicates_removed':    total_skipped_dups,
        'negatives_removed':     total_skipped_ret,
        'stock_levels_updated':  total_inv_updates,
        'new_products_created':  len(new_unique),
        'products_affected':     len(affected_pids),
        'pipeline_rerun':        bool(affected_pids),
        'cleaning_steps': [
            'Date normalisation (18 format variants)',
            'Column alias matching (flexible headers)',
            'Negative/return row removal',
            f'Duplicate (product, date) deduplication — {total_skipped_dups} removed',
            'Numeric type coercion and rounding',
            'Auto product creation for new items',
        ] + (['Stock-on-hand inventory update'] if total_inv_updates else []),
    }

    data_quality = _compute_data_quality(
        company_id, affected_pids, total_rows, total_skipped_dups, total_skipped_ret
    )

    return jsonify({
        'success':            total_rows > 0 or total_skipped_dups > 0,
        'files_processed':    len(file_summaries),
        'total_rows':         total_rows,
        'products_updated':   len(affected_pids),
        'new_products':       new_unique,
        'skipped_returns':    total_skipped_ret,
        'skipped_duplicates': total_skipped_dups,
        'inventory_updates':  total_inv_updates,
        'file_summaries':     file_summaries,
        'cleaning_summary':   cleaning_summary,
        'data_quality':       data_quality,
        'pipeline_job_id':     pipeline_job_id,
        'pipeline_queued':     bool(pipeline_job_id),
        'message': (
            f'Inserted {total_rows} rows across {len(affected_pids)} products'
            + (f' ({len(new_unique)} new)' if new_unique else '')
            + (f'. {"; ".join(extras)}' if extras else '')
            + ('. Forecast pipeline queued.' if pipeline_job_id else '.')
            if total_rows > 0
            else (
                f'No new rows inserted ({total_skipped_dups} duplicates already in database).'
                if total_skipped_dups
                else 'No rows inserted — check file_summaries for column detection details.'
            )
        ),
    })


@api.route('/upload/history')
def upload_history():
    """Return the last 20 upload log entries (manager only)."""
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    try:
        c.execute("""
            SELECT log_id, filename, uploaded_by, rows_inserted,
                   new_products, skipped_duplicates, inventory_updates, uploaded_at
            FROM upload_log
            WHERE company_id = ?
            ORDER BY uploaded_at DESC
            LIMIT 20
        """, (company_id,))
        rows = [row_to_dict(r) for r in c.fetchall()]
    except Exception as e:
        import traceback
        traceback.print_exc()
        rows = []
    conn.close()
    return jsonify(rows)


def run_pipeline_sync_for_company(company_id, product_ids=None):
    conn = get_db()
    c = conn.cursor()
    if product_ids:
        placeholders = ','.join('?' * len(product_ids))
        c.execute(
            f"SELECT product_id, is_active FROM products WHERE company_id = ? AND product_id IN ({placeholders}) ORDER BY product_id",
            [company_id, *list(product_ids)],
        )
    else:
        c.execute(
            "SELECT product_id, is_active FROM products WHERE company_id = ? ORDER BY product_id",
            (company_id,),
        )
    products = c.fetchall()

    if product_ids:
        for pid in product_ids:
            c.execute("DELETE FROM forecast WHERE company_id = ? AND product_id = ?", (company_id, pid))
            c.execute("DELETE FROM decisions WHERE company_id = ? AND product_id = ?", (company_id, pid))
            c.execute("DELETE FROM evaluation WHERE company_id = ? AND product_id = ?", (company_id, pid))
    else:
        c.execute("DELETE FROM forecast WHERE company_id = ?", (company_id,))
        c.execute("DELETE FROM decisions WHERE company_id = ?", (company_id,))
        c.execute("DELETE FROM evaluation WHERE company_id = ?", (company_id,))
        c.execute("DELETE FROM product_classification WHERE company_id = ?", (company_id,))
    conn.commit()
    conn.close()

    from services.forecast_service import run_forecast_for_product
    from services.decision_service import compute_decision_for_product
    from services.evaluation_service import run_evaluation_for_product
    from services.scenario_service import run_scenario_comparison
    from services.abc_xyz_service import run_classification

    for p in products:
        run_forecast_for_product(p['product_id'], p['is_active'])
        compute_decision_for_product(p['product_id'])
        if p['is_active']:
            run_evaluation_for_product(p['product_id'])

    run_scenario_comparison(company_id=company_id)
    run_classification(company_id=company_id)
    return len(products)


def _create_pipeline_job(company_id, product_ids=None):
    job_id = uuid.uuid4().hex
    conn = get_db()
    conn.execute(
        "INSERT INTO pipeline_jobs (job_id, company_id, status, message) VALUES (?, ?, 'queued', ?)",
        (job_id, company_id, 'Pipeline queued'),
    )
    conn.commit()
    conn.close()

    app = current_app._get_current_object()

    def worker():
        with app.app_context():
            conn2 = get_db()
            conn2.execute(
                "UPDATE pipeline_jobs SET status = 'running', message = 'Pipeline running', started_at = DATETIME('now') WHERE job_id = ?",
                (job_id,),
            )
            conn2.commit()
            conn2.close()
            try:
                processed = run_pipeline_sync_for_company(company_id, product_ids=product_ids)
                conn3 = get_db()
                conn3.execute(
                    """
                    UPDATE pipeline_jobs
                    SET status = 'complete', message = 'Pipeline complete', products_processed = ?,
                        finished_at = DATETIME('now')
                    WHERE job_id = ?
                    """,
                    (processed, job_id),
                )
                conn3.commit()
                conn3.close()
            except Exception as exc:
                conn3 = get_db()
                conn3.execute(
                    """
                    UPDATE pipeline_jobs
                    SET status = 'failed', message = 'Pipeline failed', error = ?,
                        finished_at = DATETIME('now')
                    WHERE job_id = ?
                    """,
                    (str(exc), job_id),
                )
                conn3.commit()
                conn3.close()

    threading.Thread(target=worker, name=f"stocklens-pipeline-{job_id[:8]}", daemon=True).start()
    return job_id


@api.route('/pipeline/run', methods=['POST'])
def run_pipeline_for_company():
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    job_id = _create_pipeline_job(company_id)
    return jsonify({'message': 'Pipeline queued', 'job_id': job_id, 'status': 'queued'}), 202


@api.route('/pipeline/jobs/<job_id>')
def get_pipeline_job(job_id):
    err = login_required()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM pipeline_jobs WHERE job_id = ? AND company_id = ?", (job_id, company_id))
    row = c.fetchone()
    conn.close()
    if not row:
        return jsonify({'message': 'Pipeline job not found'}), 404
    return jsonify(row_to_dict(row))


# ── Reorder Action Log ─────────────────────────────────────────────────────────

@api.route('/reorder/log', methods=['POST'])
def log_reorder_action():
    """
    Manager logs that a reorder has been placed.
    Body: { product_id, quantity_ordered, expected_days (default 7), notes }
    Creates a reorder_log entry and inserts into activity feed.
    """
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    body             = request.get_json(silent=True) or {}
    product_id       = int(body.get('product_id', 0))
    quantity_ordered = int(body.get('quantity_ordered', 0))
    expected_days    = max(1, min(180, int(body.get('expected_days', 7))))
    notes            = str(body.get('notes', '') or '').strip()[:500]

    if not product_id or quantity_ordered <= 0:
        return jsonify({'message': 'product_id and quantity_ordered (>0) are required'}), 400

    conn = get_db()
    c    = conn.cursor()
    c.execute(
        "SELECT product_name FROM products WHERE product_id = ? AND company_id = ?",
        (product_id, company_id),
    )
    product = c.fetchone()
    if not product:
        conn.close()
        return jsonify({'message': 'Product not found'}), 404

    c.execute("""
        SELECT log_id, quantity_ordered,
               DATE(ordered_at, '+' || expected_days || ' days') AS expected_arrival
        FROM reorder_log
        WHERE company_id = ? AND product_id = ? AND status = 'pending'
        ORDER BY log_id DESC
        LIMIT 1
    """, (company_id, product_id))
    pending = c.fetchone()
    if pending:
        conn.close()
        return jsonify({
            'message': (
                f'A pending reorder already exists for {product["product_name"]}: '
                f'{pending["quantity_ordered"]} units expected {pending["expected_arrival"] or "soon"}. '
                'Confirm delivery before logging another order.'
            ),
            'pending_log_id': pending['log_id'],
        }), 409

    c.execute("""
        INSERT INTO reorder_log
            (company_id, product_id, quantity_ordered, expected_days,
             ordered_by, notes, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
    """, (company_id, product_id, quantity_ordered, expected_days,
          session.get('username', 'unknown'), notes))
    log_id = c.lastrowid
    conn.commit()
    conn.close()

    return jsonify({
        'log_id':         log_id,
        'product_name':   product['product_name'],
        'quantity':       quantity_ordered,
        'expected_days':  expected_days,
        'message':        f'Reorder of {quantity_ordered} units logged for {product["product_name"]}.',
    })


@api.route('/reorder/pending')
def get_pending_reorders():
    """Return all pending reorder log entries for this company."""
    err = login_required()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    c.execute("""
        SELECT rl.log_id, rl.product_id, p.product_name,
               rl.quantity_ordered, rl.expected_days, rl.ordered_by,
               rl.notes, rl.status, rl.ordered_at,
               DATE(rl.ordered_at, '+' || rl.expected_days || ' days') AS expected_arrival
        FROM reorder_log rl
        JOIN products p ON rl.product_id = p.product_id
        WHERE rl.company_id = ? AND rl.status = 'pending'
        ORDER BY rl.ordered_at DESC
    """, (company_id,))
    rows = [row_to_dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)


@api.route('/reorder/update', methods=['POST'])
def update_pending_reorder():
    """
    Manager updates a pending reorder before delivery.
    Body: { log_id, quantity_ordered, expected_days, notes }
    Delivered reorder logs are immutable because they already affected stock.
    """
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    body = request.get_json(silent=True) or {}
    try:
        log_id = int(body.get('log_id', 0))
        quantity_ordered = int(body.get('quantity_ordered', 0))
        expected_days = max(1, min(180, int(body.get('expected_days', 7))))
    except (TypeError, ValueError):
        return jsonify({'message': 'log_id, quantity_ordered, and expected_days must be numeric'}), 400
    notes = str(body.get('notes', '') or '').strip()[:500]

    if not log_id or quantity_ordered <= 0:
        return jsonify({'message': 'log_id and quantity_ordered (>0) are required'}), 400

    conn = get_db()
    c = conn.cursor()
    c.execute("""
        SELECT rl.log_id, p.product_name
        FROM reorder_log rl
        JOIN products p ON p.product_id = rl.product_id
        WHERE rl.log_id = ? AND rl.company_id = ? AND rl.status = 'pending'
    """, (log_id, company_id))
    entry = c.fetchone()
    if not entry:
        conn.close()
        return jsonify({'message': 'Pending reorder log entry not found'}), 404

    c.execute("""
        UPDATE reorder_log
        SET quantity_ordered = ?, expected_days = ?, notes = ?
        WHERE log_id = ? AND company_id = ? AND status = 'pending'
    """, (quantity_ordered, expected_days, notes, log_id, company_id))
    conn.commit()
    conn.close()

    return jsonify({
        'message': f'Pending reorder updated for {entry["product_name"]}.',
        'log_id': log_id,
        'quantity_ordered': quantity_ordered,
        'expected_days': expected_days,
    })


@api.route('/reorder/confirm', methods=['POST'])
def confirm_reorder_delivery():
    """
    Manager confirms delivery — updates stock_on_hand and marks log entry as delivered.
    Body: { log_id, actual_quantity (optional, defaults to quantity_ordered) }
    """
    err = manager_only()
    if err:
        return err
    company_id, company_err = require_company()
    if company_err:
        return company_err

    body            = request.get_json(silent=True) or {}
    log_id          = int(body.get('log_id', 0))
    actual_quantity = body.get('actual_quantity')

    if not log_id:
        return jsonify({'message': 'log_id is required'}), 400

    conn = get_db()
    c    = conn.cursor()
    c.execute(
        "SELECT * FROM reorder_log WHERE log_id = ? AND company_id = ? AND status = 'pending'",
        (log_id, company_id),
    )
    entry = c.fetchone()
    if not entry:
        conn.close()
        return jsonify({'message': 'Pending reorder log entry not found'}), 404

    qty = int(actual_quantity) if actual_quantity is not None else entry['quantity_ordered']
    if qty <= 0:
        conn.close()
        return jsonify({'message': 'actual_quantity must be positive'}), 400

    # Update stock
    c.execute("""
        UPDATE inventory
        SET stock_on_hand = stock_on_hand + ?,
            last_updated  = DATE('now')
        WHERE company_id = ? AND product_id = ?
    """, (qty, company_id, entry['product_id']))

    # Mark delivered
    c.execute("""
        UPDATE reorder_log
        SET status = 'delivered', actual_quantity = ?, delivered_at = DATETIME('now')
        WHERE log_id = ?
    """, (qty, log_id))

    conn.commit()

    # Refresh forecast/decisions for this product
    product_id = entry['product_id']
    c.execute(
        "SELECT is_active FROM products WHERE product_id = ? AND company_id = ?",
        (product_id, company_id),
    )
    prod = c.fetchone()
    conn.close()

    if prod:
        from services.forecast_service   import run_forecast_for_product
        from services.decision_service   import compute_decision_for_product
        from services.evaluation_service import run_evaluation_for_product
        conn2 = get_db()
        c2 = conn2.cursor()
        c2.execute("DELETE FROM forecast  WHERE company_id=? AND product_id=?", (company_id, product_id))
        c2.execute("DELETE FROM decisions WHERE company_id=? AND product_id=?", (company_id, product_id))
        c2.execute("DELETE FROM evaluation WHERE company_id=? AND product_id=?", (company_id, product_id))
        conn2.commit()
        conn2.close()
        run_forecast_for_product(product_id, prod['is_active'])
        compute_decision_for_product(product_id)
        if prod['is_active']:
            run_evaluation_for_product(product_id)

    return jsonify({
        'message':         f'Delivery confirmed — {qty} units added to stock.',
        'product_id':      product_id,
        'quantity_added':  qty,
    })
