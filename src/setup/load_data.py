import pandas as pd
import sqlite3

# load CSV
df = pd.read_csv("data/sales.csv")

# connect to database
conn = sqlite3.connect("db/stocklens.db")

# insert into sales table
df.to_sql("sales", conn, if_exists="append", index=False)

conn.close()

print("CSV data loaded into database!")