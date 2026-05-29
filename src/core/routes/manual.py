"""
Manual Data Entry routes for StockLens.

Manager-only. Allows creating products and recording sales without CSV uploads.
Data is stored in the same products/sales tables and triggers the same pipeline,
ensuring manual entries are indistinguishable from uploaded data in forecasting.

Endpoints:
  POST /api/manual/product              — create a new product
  POST /api/manual/sales                — record / update a single sales entry
  GET  /api/manual/sales/<product_id>   — full time-series for a product
  GET  /api/manual/products             — list all manually-created products
  POST /api/manual/pipeline/<product_id>— run forecast + decision + eval for one product
"""

import logging
import re
from datetime import date, timedelta

from flask import Blueprint, jsonify, request, session

from auth_utils import api_login_required, api_manager_only, require_company
from database import get_db

log = logging.getLogger(__name__)

manual_bp = Blueprint('manual', __name__)


# ── auth helpers (mirrors api.py style) ────────────────────────────────────────

def _login_required():
    return api_login_required()


def _manager_only():
    return api_manager_only()


def _require_company():
    return require_company()


# ── internal helpers ───────────────────────────────────────────────────────────

def _fill_date_gaps(conn, company_id: int, product_id: int) -> int:
    """
    Ensure a contiguous daily record from min_date to max_date exists for this product.
    Missing days are inserted with units_sold = 0 and data_source = 'manual'.
    Returns the number of zero-fill days inserted.
    """
    c = conn.cursor()
    c.execute(
        "SELECT MIN(date) AS min_d, MAX(date) AS max_d "
        "FROM sales WHERE company_id = ? AND product_id = ?",
        (company_id, product_id),
    )
    row = c.fetchone()
    if not row or not row['min_d']:
        return 0

    min_d = date.fromisoformat(row['min_d'])
    max_d = date.fromisoformat(row['max_d'])

    c.execute(
        "SELECT date FROM sales WHERE company_id = ? AND product_id = ?",
        (company_id, product_id),
    )
    existing_dates = {r['date'] for r in c.fetchall()}

    filled = 0
    current = min_d
    while current <= max_d:
        ds = current.isoformat()
        if ds not in existing_dates:
            c.execute(
                "INSERT INTO sales (company_id, product_id, date, units_sold, data_source) "
                "VALUES (?, ?, ?, 0, 'manual')",
                (company_id, product_id, ds),
            )
            filled += 1
        current += timedelta(days=1)

    return filled


def _count_sales_days(conn, company_id: int, product_id: int) -> int:
    c = conn.cursor()
    c.execute(
        "SELECT COUNT(*) AS cnt FROM sales WHERE company_id = ? AND product_id = ?",
        (company_id, product_id),
    )
    return c.fetchone()['cnt']


_CATEGORY_RULES = (
    ('Beverages', ('fanta', 'cola', 'coke', 'pepsi', 'sprite', '7up', 'juice', 'water', 'drink', 'soda', 'lemonade', 'tonic', 'smoothie')),
    ('Hot Drinks', ('coffee', 'tea', 'tea bags', 'pg tips', 'espresso', 'latte', 'cappuccino', 'hot chocolate', 'cocoa')),
    ('Dairy', ('milk', 'cheese', 'yoghurt', 'yogurt', 'butter', 'cream')),
    ('Bakery', ('bread', 'bun', 'roll', 'bagel', 'croissant', 'cake', 'muffin', 'pastry')),
    ('Snacks', ('crisps', 'chips', 'chocolate', 'bar', 'biscuit', 'cookie', 'sweets', 'candy', 'nuts', 'popcorn')),
    ('Health & Beauty', ('shampoo', 'soap', 'toothpaste', 'deodorant', 'cream', 'lotion', 'sun cream', 'spf')),
    ('Health', ('paracetamol', 'ibuprofen', 'medicine', 'vitamin', 'plaster', 'tablet', 'tabs')),
    ('Stationery', ('pen', 'pencil', 'notebook', 'paper', 'card', 'envelope')),
    ('Seasonal', ('mince pie', 'christmas', 'easter', 'halloween', 'valentine')),
)


def _infer_category(product_name: str) -> str:
    normalized = f" {re.sub(r'[^a-z0-9]+', ' ', (product_name or '').lower())} "
    for category, keywords in _CATEGORY_RULES:
        if any(f" {re.sub(r'[^a-z0-9]+', ' ', keyword.lower())} " in normalized for keyword in keywords):
            return category
    return 'General'


def _parse_optional_money(value, field_name: str):
    if value is None or value == '':
        return None, None
    try:
        parsed = float(value)
        if parsed < 0:
            raise ValueError
        return parsed, None
    except (ValueError, TypeError):
        return None, (jsonify({'message': f'{field_name} must be a non-negative number'}), 400)


# ── POST /api/manual/product ───────────────────────────────────────────────────

@manual_bp.route('/manual/product', methods=['POST'])
def create_manual_product():
    """Create a new product via manual entry mode."""
    err = _manager_only()
    if err:
        return err
    company_id, company_err = _require_company()
    if company_err:
        return company_err

    body     = request.get_json(silent=True) or {}
    name     = (body.get('name') or '').strip()
    category = (body.get('category') or '').strip()
    stock    = body.get('current_stock', 0)
    purchase_cost = body.get('purchase_cost')
    price = body.get('selling_price', body.get('price'))

    if not name:
        return jsonify({'message': 'Product name is required'}), 400

    if not category:
        category = _infer_category(name)

    try:
        stock = int(stock)
        if stock < 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({'message': 'current_stock must be a non-negative integer'}), 400

    purchase_cost, purchase_cost_err = _parse_optional_money(purchase_cost, 'purchase_cost')
    if purchase_cost_err:
        return purchase_cost_err

    price, price_err = _parse_optional_money(price, 'selling_price')
    if price_err:
        return price_err

    conn = get_db()
    c    = conn.cursor()

    # Prevent duplicate names within the same company
    c.execute(
        "SELECT product_id FROM products WHERE company_id = ? AND LOWER(product_name) = LOWER(?)",
        (company_id, name),
    )
    if c.fetchone():
        conn.close()
        return jsonify({'message': f'A product named "{name}" already exists'}), 409

    # Auto-generate a manual SKU
    c.execute("SELECT COUNT(*) AS cnt FROM products WHERE company_id = ?", (company_id,))
    count = c.fetchone()['cnt']
    sku = f"MAN-{count + 1:04d}"

    c.execute(
        "INSERT INTO products "
        "(company_id, product_name, sku, category, purchase_cost, price, is_active, data_source) "
        "VALUES (?, ?, ?, ?, ?, ?, 1, 'manual')",
        (company_id, name, sku, category, purchase_cost, price),
    )
    product_id = c.lastrowid

    # Seed an inventory row so the product appears in the inventory tab immediately
    c.execute(
        "INSERT INTO inventory (company_id, product_id, stock_on_hand, last_updated) "
        "VALUES (?, ?, ?, DATE('now'))",
        (company_id, product_id, stock),
    )

    conn.commit()
    conn.close()

    log.info(
        "Manual product created: %s (id=%d, sku=%s, company=%d)",
        name, product_id, sku, company_id,
    )

    return jsonify({
        'message':      f'Product "{name}" created successfully',
        'product_id':   product_id,
        'product_name': name,
        'sku':          sku,
        'category':     category,
        'purchase_cost': purchase_cost,
        'selling_price': price,
    }), 201


# ── POST /api/manual/sales ─────────────────────────────────────────────────────

@manual_bp.route('/manual/sales', methods=['POST'])
def add_manual_sales():
    """
    Record (or update) a single daily sales entry for a product.
    If the date already exists the units_sold value is overwritten.
    Date gaps between the earliest and latest entry are filled with zeros.
    """
    err = _manager_only()
    if err:
        return err
    company_id, company_err = _require_company()
    if company_err:
        return company_err

    body       = request.get_json(silent=True) or {}
    product_id = body.get('product_id')
    date_str   = (body.get('date') or '').strip()
    units_sold = body.get('units_sold')

    # --- validate product_id ---
    if product_id is None:
        return jsonify({'message': 'product_id is required'}), 400
    try:
        product_id = int(product_id)
    except (ValueError, TypeError):
        return jsonify({'message': 'product_id must be an integer'}), 400

    # --- validate date ---
    if not date_str:
        return jsonify({'message': 'date is required (YYYY-MM-DD)'}), 400
    try:
        entry_date = date.fromisoformat(date_str)
    except ValueError:
        return jsonify({'message': 'date must be in YYYY-MM-DD format'}), 400
    if entry_date > date.today():
        return jsonify({'message': 'date cannot be in the future'}), 400

    # --- validate units_sold ---
    if units_sold is None:
        return jsonify({'message': 'units_sold is required'}), 400
    try:
        units_sold = int(units_sold)
        if units_sold < 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({'message': 'units_sold must be a non-negative integer'}), 400

    conn = get_db()
    c    = conn.cursor()

    # Verify the product belongs to this company
    c.execute(
        "SELECT product_id, product_name FROM products "
        "WHERE product_id = ? AND company_id = ?",
        (product_id, company_id),
    )
    product = c.fetchone()
    if not product:
        conn.close()
        return jsonify({'message': 'Product not found'}), 404

    # Upsert: update if the date exists, insert otherwise
    c.execute(
        "SELECT sale_id FROM sales "
        "WHERE company_id = ? AND product_id = ? AND date = ?",
        (company_id, product_id, date_str),
    )
    existing = c.fetchone()

    if existing:
        c.execute(
            "UPDATE sales SET units_sold = ?, data_source = 'manual' WHERE sale_id = ?",
            (units_sold, existing['sale_id']),
        )
        action = 'updated'
    else:
        c.execute(
            "INSERT INTO sales (company_id, product_id, date, units_sold, data_source) "
            "VALUES (?, ?, ?, ?, 'manual')",
            (company_id, product_id, date_str, units_sold),
        )
        action = 'inserted'

    filled     = _fill_date_gaps(conn, company_id, product_id)
    total_days = _count_sales_days(conn, company_id, product_id)
    conn.commit()
    conn.close()

    log.info(
        "Manual sales %s: product_id=%d date=%s units=%d gaps_filled=%d total_days=%d (company=%d)",
        action, product_id, date_str, units_sold, filled, total_days, company_id,
    )

    return jsonify({
        'message':        f'Sales entry {action}',
        'product_id':     product_id,
        'product_name':   product['product_name'],
        'date':           date_str,
        'units_sold':     units_sold,
        'action':         action,
        'filled_gaps':    filled,
        'total_days':     total_days,
        'pipeline_ready': total_days >= 30,
    }), 200


# ── GET /api/manual/sales/<product_id> ────────────────────────────────────────

@manual_bp.route('/manual/sales/<int:product_id>', methods=['GET'])
def get_manual_timeline(product_id):
    """Return the complete daily time-series for a manually-entered product."""
    err = _manager_only()
    if err:
        return err
    company_id, company_err = _require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()

    c.execute(
        "SELECT product_id, product_name FROM products "
        "WHERE product_id = ? AND company_id = ?",
        (product_id, company_id),
    )
    product = c.fetchone()
    if not product:
        conn.close()
        return jsonify({'message': 'Product not found'}), 404

    c.execute(
        "SELECT date, units_sold, data_source "
        "FROM sales "
        "WHERE company_id = ? AND product_id = ? "
        "ORDER BY date DESC",
        (company_id, product_id),
    )
    rows       = [dict(r) for r in c.fetchall()]
    total_days = len(rows)
    # Zero-fill rows that were auto-inserted for gap continuity
    filled_count = sum(
        1 for r in rows
        if r['units_sold'] == 0 and r.get('data_source') == 'manual'
    )
    conn.close()

    return jsonify({
        'product_id':     product_id,
        'product_name':   product['product_name'],
        'total_days':     total_days,
        'filled_days':    filled_count,
        'pipeline_ready': total_days >= 30,
        'rows':           rows,
    })


# ── GET /api/manual/products ───────────────────────────────────────────────────

@manual_bp.route('/manual/products', methods=['GET'])
def get_manual_products():
    """List all manually-created products with their sales summary and decision."""
    err = _manager_only()
    if err:
        return err
    company_id, company_err = _require_company()
    if company_err:
        return company_err

    conn = get_db()
    c    = conn.cursor()
    c.execute(
        """
        SELECT
            p.product_id,
            p.product_name,
            p.category,
            p.purchase_cost,
            p.price,
            p.sku,
            COALESCE(i.stock_on_hand, 0)     AS stock_on_hand,
            COUNT(s.sale_id)                  AS total_days,
            COALESCE(SUM(s.units_sold), 0)    AS total_units,
            MAX(s.date)                        AS last_entry,
            d.action                           AS decision
        FROM products p
        LEFT JOIN inventory i
            ON i.product_id = p.product_id AND i.company_id = p.company_id
        LEFT JOIN sales s
            ON s.product_id = p.product_id AND s.company_id = p.company_id
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
        WHERE p.company_id = ? AND p.data_source = 'manual'
        GROUP BY p.product_id
        ORDER BY p.product_name
        """,
        (company_id, company_id, company_id),
    )
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)


# ── POST /api/manual/pipeline/<product_id> ────────────────────────────────────

@manual_bp.route('/manual/pipeline/<int:product_id>', methods=['POST'])
def run_manual_pipeline(product_id):
    """
    Trigger forecast → decision → evaluation for a single manually-entered product.
    Requires >= 30 days of sales data.  Evaluation is only attempted with >= 90 days.
    """
    err = _manager_only()
    if err:
        return err
    company_id, company_err = _require_company()
    if company_err:
        return company_err

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

    total_days = _count_sales_days(conn, company_id, product_id)
    conn.close()

    if total_days < 30:
        return jsonify({
            'message':        (
                f'Insufficient data — need at least 30 days of sales. '
                f'You have {total_days} so far. '
                f'Add {30 - total_days} more day(s) to unlock forecasting.'
            ),
            'total_days':     total_days,
            'pipeline_ready': False,
        }), 400

    from services.forecast_service import run_forecast_for_product
    from services.decision_service import compute_decision_for_product
    from services.evaluation_service import run_evaluation_for_product

    try:
        run_forecast_for_product(product_id, is_active=1)
        compute_decision_for_product(product_id)
        evaluated = total_days >= 90
        if evaluated:
            run_evaluation_for_product(product_id)

        log.info(
            "Manual pipeline complete: product_id=%d evaluated=%s (company=%d)",
            product_id, evaluated, company_id,
        )
        return jsonify({
            'message':        f'Pipeline complete for "{product["product_name"]}"',
            'product_id':     product_id,
            'evaluated':      evaluated,
            'pipeline_ready': True,
        })

    except Exception as exc:
        log.exception(
            "Manual pipeline error: product_id=%d company=%d — %s",
            product_id, company_id, exc,
        )
        return jsonify({'message': 'Pipeline failed — check server logs'}), 500
