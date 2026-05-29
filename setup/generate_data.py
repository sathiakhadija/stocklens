"""
Generates realistic UK corner-store retail data for StockLens V1.
14 products, 2 years of daily sales (2023-01-01 to 2024-12-31).
Demonstrates: high/low volume, seasonal products, inactive status, varying risk levels.
"""
import sqlite3
import os
import random
import math
from datetime import date, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT, 'db', 'stocklens.db')

random.seed(42)

# Product definitions
# monthly_mult: overrides base demand for that month (key = month int, val = multiplier)
PRODUCTS = [
    {
        "name": "Milk 2L", "cat": "Dairy", "price": 1.35,
        "active": 1, "seasonal": 0, "season": None,
        "base": 15, "std": 3, "wknd": 1.3, "monthly": {},
    },
    {
        "name": "White Bread 800g", "cat": "Bakery", "price": 1.10,
        "active": 1, "seasonal": 0, "season": None,
        "base": 12, "std": 3, "wknd": 1.2, "monthly": {},
    },
    {
        "name": "Cola 330ml", "cat": "Drinks", "price": 1.20,
        "active": 1, "seasonal": 0, "season": None,
        "base": 20, "std": 5, "wknd": 1.4,
        "monthly": {6: 1.5, 7: 1.8, 8: 1.7, 12: 1.3, 1: 0.8},
    },
    {
        "name": "Orange Juice 1L", "cat": "Drinks", "price": 2.50,
        "active": 1, "seasonal": 0, "season": None,
        "base": 8, "std": 2, "wknd": 1.2,
        "monthly": {6: 1.3, 7: 1.4, 8: 1.3},
    },
    {
        "name": "Chocolate Bar", "cat": "Snacks", "price": 1.00,
        "active": 1, "seasonal": 0, "season": None,
        "base": 18, "std": 4, "wknd": 1.5,
        "monthly": {12: 1.6, 1: 1.4, 2: 1.5, 7: 0.8},
    },
    {
        "name": "Ready Salted Crisps", "cat": "Snacks", "price": 0.85,
        "active": 1, "seasonal": 0, "season": None,
        "base": 22, "std": 5, "wknd": 1.6,
        "monthly": {6: 1.3, 7: 1.5, 8: 1.4},
    },
    {
        "name": "Ground Coffee 200g", "cat": "Hot Drinks", "price": 4.50,
        "active": 1, "seasonal": 0, "season": None,
        "base": 4, "std": 1, "wknd": 1.1,
        "monthly": {11: 1.3, 12: 1.5, 1: 1.4, 2: 1.3, 7: 0.7, 8: 0.6},
    },
    {
        "name": "PG Tips 80 Bags", "cat": "Hot Drinks", "price": 3.20,
        "active": 1, "seasonal": 0, "season": None,
        "base": 6, "std": 2, "wknd": 1.0,
        "monthly": {11: 1.2, 12: 1.3, 1: 1.4, 7: 0.6, 8: 0.5},
    },
    {
        "name": "Bottled Water 500ml", "cat": "Drinks", "price": 0.80,
        "active": 1, "seasonal": 1, "season": "summer",
        "base": 10, "std": 4, "wknd": 1.3,
        "monthly": {5: 2.0, 6: 3.5, 7: 4.5, 8: 4.0, 9: 2.0, 1: 0.3, 2: 0.3, 12: 0.4},
    },
    {
        "name": "Mince Pies 6pk", "cat": "Seasonal", "price": 2.00,
        "active": 1, "seasonal": 1, "season": "winter",
        "base": 0, "std": 2, "wknd": 1.4,
        "monthly": {10: 5, 11: 12, 12: 20, 1: 8, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 1},
    },
    {
        # Marked INACTIVE — demonstrates the inactive product flow
        "name": "Sun Cream SPF50", "cat": "Health & Beauty", "price": 8.99,
        "active": 0, "seasonal": 1, "season": "summer",
        "base": 0, "std": 2, "wknd": 1.2,
        "monthly": {4: 3, 5: 8, 6: 12, 7: 15, 8: 10, 9: 4, 10: 0, 11: 0, 12: 0, 1: 0, 2: 0, 3: 1},
    },
    {
        "name": "Paracetamol 16 tabs", "cat": "Health", "price": 0.99,
        "active": 1, "seasonal": 0, "season": None,
        "base": 5, "std": 2, "wknd": 0.9,
        "monthly": {1: 1.5, 2: 1.4, 11: 1.3, 12: 1.4},
    },
    {
        # Slow mover — demonstrates HIGH risk
        "name": "Batteries AA 4pk", "cat": "General", "price": 4.99,
        "active": 1, "seasonal": 0, "season": None,
        "base": 2, "std": 1, "wknd": 1.1,
        "monthly": {11: 1.5, 12: 2.0},
    },
    {
        "name": "Greeting Cards", "cat": "Stationery", "price": 2.99,
        "active": 1, "seasonal": 0, "season": None,
        "base": 3, "std": 1, "wknd": 1.3,
        "monthly": {12: 2.5, 2: 1.8, 5: 1.6},
    },
]

# Stock levels designed to produce varied risk outcomes for demonstration
INVENTORY = {
    "Milk 2L":              180,   # LOW risk  (well stocked)
    "White Bread 800g":     150,   # LOW risk
    "Cola 330ml":           280,   # LOW risk
    "Orange Juice 1L":       60,   # MEDIUM risk
    "Chocolate Bar":        120,   # MEDIUM risk
    "Ready Salted Crisps":  250,   # LOW risk
    "Ground Coffee 200g":     4,   # REORDER (stock < safety stock ~5.5)
    "PG Tips 80 Bags":        3,   # REORDER (stock < safety stock ~10)
    "Bottled Water 500ml":  200,   # LOW risk
    "Mince Pies 6pk":        40,   # MEDIUM risk
    "Sun Cream SPF50":        5,   # INACTIVE  (doesn't matter)
    "Paracetamol 16 tabs":   25,   # MEDIUM risk
    "Batteries AA 4pk":       6,   # HIGH risk  (very slow mover, minimal stock)
    "Greeting Cards":        35,   # MEDIUM risk
}


def daily_units(product, current_date):
    month = current_date.month
    weekday = current_date.weekday()

    base = float(product["base"])
    monthly = product.get("monthly", {})

    if base == 0:
        # Seasonal base-zero product: monthly dict provides absolute daily demand
        # (not a multiplier). Months absent from the dict → truly 0 sales.
        base = float(monthly.get(month, 0))
        if base <= 0:
            return 0  # off-season: no sales at all
    else:
        # Regular product: monthly dict is a demand multiplier
        base = base * monthly.get(month, 1.0)

    if weekday >= 5:
        base = base * product.get("wknd", 1.0)

    std = product.get("std", 1)
    return max(0, int(random.gauss(base, std)))


def seed_all():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.executescript("""
        DELETE FROM evaluation;
        DELETE FROM decisions;
        DELETE FROM forecast;
        DELETE FROM inventory;
        DELETE FROM sales;
        DELETE FROM products;
        DELETE FROM users;
    """)

    # Users
    users = [
        ("manager1", "pass123", "manager"),
        ("staff1",   "pass123", "staff"),
        ("admin",    "admin123", "manager"),
    ]
    c.executemany(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)", users
    )

    start = date(2023, 1, 1)
    end   = date(2024, 12, 31)
    days  = (end - start).days + 1

    for p in PRODUCTS:
        c.execute("""
            INSERT INTO products (product_name, category, price, is_active, is_seasonal, season)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (p["name"], p["cat"], p["price"], p["active"], p["seasonal"], p["season"]))
        pid = c.lastrowid

        # Daily sales
        sales_batch = []
        current = start
        for _ in range(days):
            units = daily_units(p, current)
            sales_batch.append((pid, current.strftime("%Y-%m-%d"), units))
            current += timedelta(days=1)
        c.executemany(
            "INSERT INTO sales (product_id, date, units_sold) VALUES (?, ?, ?)",
            sales_batch
        )

        # Inventory
        stock = INVENTORY.get(p["name"], 50)
        c.execute("""
            INSERT INTO inventory (product_id, stock_on_hand, last_updated)
            VALUES (?, ?, DATE('now'))
        """, (pid, stock))

    conn.commit()
    conn.close()
    print(f"Seeded {len(PRODUCTS)} products with {days} days of sales data.")
    print("Users: manager1/pass123, staff1/pass123, admin/admin123")


if __name__ == '__main__':
    seed_all()
