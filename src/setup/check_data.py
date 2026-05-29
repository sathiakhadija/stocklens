import sqlite3

conn = sqlite3.connect("db/stocklens.db")
cursor = conn.cursor()

# check products
cursor.execute("SELECT * FROM products")
print("Products:")
for p in cursor.fetchall():
    print(p)

# check users
cursor.execute("SELECT * FROM users")
print("\nUsers:")
for u in cursor.fetchall():
    print(u)

# check sales
cursor.execute("SELECT * FROM sales")
print("\nSales:")
for s in cursor.fetchall():
    print(s)

# check inventory
cursor.execute("SELECT * FROM inventory")
print("\nInventory:")
for i in cursor.fetchall():
    print(i)

# check forecast
cursor.execute("SELECT * FROM forecast")
print("\nForecast:")
for f in cursor.fetchall():
    print(f)

conn.close()